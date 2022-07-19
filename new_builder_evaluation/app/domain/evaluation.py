import requests
import json
import yaml
import secrets
import os
import boto3
import jsonlines

from app.domain.builder import Builder
from app.infrastructure.repositories.task import TaskRepository 
from app.infrastructure.repositories.score import ScoreRepository
from app.infrastructure.repositories.dataset import DatasetRepository
from app.domain.eval_utils.input_formatter import InputFormatter
from app.domain.eval_utils.evaluator import Evaluator


class Evaluation:
    
    def __init__(self):
        self.session = boto3.Session(
            aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
            aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
            region_name=os.getenv('AWS_REGION')
        )
        self.s3 = self.session.client('s3')
        self.sqs = self.session.client('sqs')
        self.s3_bucket = os.getenv('AWS_S3_BUCKET')
        self.builder = Builder()
        self.task_repository = TaskRepository()
        self.score_repository = ScoreRepository()
        self.dataset_repository = DatasetRepository()
        
    def require_fields_task(self):
        return 
        
    def get_task_configuration(self, task_id:int):
        task_repository = TaskRepository()
        task_configuration = yaml.safe_load(task_repository.get_by_id(task_id)['config_yaml'])
        return task_configuration
    
    def single_evaluation_ecs(self, ip:str, text):
        headers = {
            'accept': 'application/json',
        }
        json_data = {
            'input_text': text,
        }
        response = requests.post('http://{}/model/single_evaluation'.format(ip), headers=headers, json=json_data)
        return json.loads(response.text)
    
    def get_scoring_datasets(self, task_id: int, round_id: int):
        scoring_datasets = self.dataset_repository.get_scoring_datasets(task_id, round_id)
        jsonl_scoring_datasets = []
        for scoring_dataset in scoring_datasets:
            jsonl_scoring_datasets.append('{}'.format(scoring_dataset.name))
        return jsonl_scoring_datasets
    
    def downloads_scoring_datasets(self, jsonl_scoring_datasets:list, bucket_name:str, task_code:str, delta_metrics:list):
        final_datasets = []
        for scoring_dataset in jsonl_scoring_datasets:
            base_dataset_name = 'datasets/{}/{}.jsonl'.format(task_code, scoring_dataset)
            self.s3.download_file(bucket_name,
                                    base_dataset_name,
                                    './app/datasets/{}.jsonl'.format(scoring_dataset))  
            final_datasets.append('{}.jsonl'.format(scoring_dataset))
            for delta_metric in delta_metrics:
                delta_dataset_name = 'datasets/{}/{}-{}.jsonl'.format(task_code, delta_metric, scoring_dataset)
                self.s3.download_file(bucket_name,
                                    delta_dataset_name,
                                    './app/datasets/{}-{}.jsonl'.format(delta_metric, scoring_dataset))
                final_datasets.append('{}-{}.jsonl'.format(delta_metric, scoring_dataset))
        return final_datasets
    
    def heavy_prediction(self, datasets:list, task_code:str, model:str):
        #ip, model_name = self.builder.get_ip_ecs_task(model)
        ip = '13.38.26.40'
        model_name = 'dynalab-base-sentiment'
        for dataset in datasets:
            with jsonlines.open('./app/datasets/{}'.format(dataset), 'r') as jsonl_f:
                lst = [obj for obj in jsonl_f]
            responses = []
            for line in lst:
                answer = self.single_evaluation_ecs(ip, line['statement'])
                answer['signature'] = secrets.token_hex(15)
                answer['id'] = line['uid']
                responses.append(answer) 
            predictions = './app/datasets/{}.out'.format(dataset)
            with jsonlines.open(predictions, 'w') as writer:
                writer.write_all(responses)
            name_prediction = predictions.split('/')[-1]
            self.s3.upload_file(predictions,
                                self.s3_bucket,
                                'predictions/{}/{}/{}'.format(task_code, model_name, name_prediction))
        return {'base':{'dataset':'./app/datasets/rafa.jsonl',
                     'predictions':'./app/datasets/rafa.jsonl.out'},
                'fairness': {'dataset':'./app/datasets/fairness-rafa.jsonl',
                     'predictions':'./app/datasets/fairness-rafa.jsonl.out'},
                'robustness': {'dataset':'./app/datasets/robustness-rafa.jsonl',
                     'predictions':'./app/datasets/robustness-rafa.jsonl.out'}}

    def evaluation(self, task_id:int, task_code:str):
        delta_metrics = self.get_task_configuration(task_id)['delta_metrics']
        delta_metrics = [delta_metric['type'] for delta_metric in delta_metrics]
        jsonl_scoring_datasets = self.get_scoring_datasets(task_id, 1)
        datasets = self.downloads_scoring_datasets(jsonl_scoring_datasets, self.s3_bucket, task_code, delta_metrics)
        prediction_dict = self.heavy_prediction(datasets, task_code, 'models/sentiment/1675-dynalab-base-sentiment.zip')
        data_dict = {}
        for data_version, data_types in prediction_dict.items():
            for data_type in data_types:
                data_dict[f'{data_version}_{data_type}'] = self._load_dataset(prediction_dict[data_version][data_type])
        perturb_exists = 'fairness_predictions' in data_dict or 'robustness_predictions' in data_dict

        task_configuration = yaml.safe_load(self.task_repository.get_by_id(task_id)['config_yaml'])
        input_formatter = InputFormatter(task_configuration)

        formatted_dict = {}
        for data_type in data_dict:
            huevon = f'formatted_{data_type}'
            ferovaes = f'grouped_{data_type}'
            if 'dataset' in data_type:
                formatted_dict[huevon] = input_formatter.format_labels(data_dict[data_type])
                formatted_dict[ferovaes] = input_formatter.group_labels(formatted_dict[huevon])
            elif 'predictions' in data_type:
                formatted_dict[huevon] = input_formatter.format_predictions(data_dict[data_type])
                formatted_dict[ferovaes] = input_formatter.group_predictions(formatted_dict[huevon])

        evaluator = Evaluator(task_configuration)
        main_metric = evaluator.evaluate(formatted_dict['formatted_base_predictions'],
                                         formatted_dict['formatted_base_dataset'])
        delta_metrics = {}
        if perturb_exists:
            delta_metrics = evaluator.evaluate_delta_metrics(
                formatted_dict.get('grouped_base_predictions'),
                formatted_dict.get('grouped_robustness_predictions'),
                formatted_dict.get('grouped_fairness_predictions'))
            
        metric = task_configuration['perf_metric']['type']
        final_scores = {str(metric): main_metric,
                       'fairness': delta_metrics.get('fairness'),
                       'robustness': delta_metrics.get('robustness'),
                       'memory': 0,
                       'throughput': 0}

        new_score = {'perf': main_metric['perf'],
                     'pretty_perf': main_metric['pretty_perf'],
                     'fairness': final_scores['fairness'], 'robustness': final_scores['robustness'],
                     'id': 2323,
                     'mid': 1,
                     'r_realid': 4,
                     'did': 1,
                     'memory_utilization': final_scores['memory'],
                     'examples_per_second': final_scores['throughput']}

        self.score_repository.add(new_score)
        return new_score
    
    def get_sqs_messages(self):
        queue_url = self.sqs.get_queue_url(
                QueueName=os.getenv('SQS_NEW_BUILDER'),
            )['QueueUrl']
        response = self.sqs.receive_message(
            QueueUrl=queue_url,
            MaxNumberOfMessages=1,
            WaitTimeSeconds=10,
        )
        return response.get("Messages", [])
        
        
    @staticmethod
    def _load_dataset(path: str):
        data = []
        with open(path, 'r') as f:
            for line in f.readlines():
                data.append(json.loads(line))
        return data

    def _upload_results(evaluated_model_metrics: dict):
        return None



        



        




