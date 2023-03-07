import React, { useContext, useEffect, useState } from "react";
import AnnotationTitle from "../../components/CreateSamples/CreateSamples/AnnotationTitle";
import AnnotationHelperButtons from "../../components/CreateSamples/CreateSamples/AnnotationHelperButtons";
import AnnotationGoalStrategy from "new_front/components/CreateSamples/CreateSamples/AnnotationInterfaces/Goals/AnnotationGoalStrategy";
import AnnotationContextStrategy from "new_front/components/CreateSamples/CreateSamples/AnnotationInterfaces/Contexts/AnnotationContextStrategy";
import AnnotationUserInputStrategy from "new_front/components/CreateSamples/CreateSamples/AnnotationInterfaces/UserInput/AnnotationUserInputStrategy";
import AnnotationButtonActions from "../../components/CreateSamples/CreateSamples/AnnotationButtonActions";
import useFetch from "use-http";
import ResponseInfo from "new_front/components/CreateSamples/CreateSamples/ResponseInfo";
import { ModelOutputType } from "new_front/types/createSamples/modelOutput";
import { InfoContextTask } from "new_front/types/createSamples/configurationTask";
import { useHistory, useParams } from "react-router-dom";
import { PacmanLoader } from "react-spinners";
import UserContext from "containers/UserContext";

const CreateInterface = () => {
  const [modelInputs, setModelInputs] = useState<object>({});
  const [modelOutput, setModelOutput] = useState<ModelOutputType>();
  const [modelInTheLoop, setModelInTheLoop] = useState<string>("");
  const [taskContextInfo, setTaskContextInfo] = useState<InfoContextTask>();
  const [taskInfoName, setTaskInfoName] = useState<string>("");
  const { get, post, response, loading } = useFetch();
  let { taskCode } = useParams<{ taskCode: string }>();

  const userContext = useContext(UserContext);
  const history = useHistory();
  const { user } = userContext;

  const updateModelInputs = (input: object) => {
    setModelInputs((prevModelInputs) => {
      return { ...prevModelInputs, ...input };
    });
  };

  const loadTaskContextData = async () => {
    const taskId = await get(`/task/get_task_id_by_task_code/${taskCode}`);
    const [taskContextInfo, modelInTheLoop, taskInfo] = await Promise.all([
      post(`/context/get_context`, {
        task_id: taskId,
      }),
      post(`/model/get_model_in_the_loop`, {
        task_id: taskId,
      }),
      get(`/task/get_task_with_round_info_by_task_id/${taskId}`),
    ]).then();
    if (response.ok) {
      setTaskContextInfo(taskContextInfo);
      setModelInTheLoop(modelInTheLoop.light_model);
      setTaskInfoName(taskInfo.name);
    }
  };

  useEffect(() => {
    if (!user.id) {
      console.log("user not logged in");
      history.push(
        "/login?msg=" +
          encodeURIComponent(
            "Please sign up or log in so that you can upload a model"
          ) +
          "&src=" +
          encodeURIComponent(`/tasks/${taskCode}/create`)
      );
    }
    loadTaskContextData();
  }, []);

  return (
    <>
      {loading || !taskContextInfo ? (
        <div className="flex items-center justify-center h-screen">
          <PacmanLoader color="#ccebd4" loading={loading} size={50} />
        </div>
      ) : (
        <div className="container">
          <div id="title">
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <AnnotationTitle taskName={taskInfoName} />
              </div>
              <div>
                <div className="grid grid-cols-3 gap-2">
                  {/* <AnnotationHelperButtons /> */}
                </div>
              </div>
            </div>
          </div>
          <div id="goal" className="mb-3 ">
            <AnnotationGoalStrategy
              config={taskContextInfo?.context_info.goal as any}
              task={{}}
              onInputChange={updateModelInputs}
            />
          </div>
          <div className="border-2 ">
            <div id="context" className="p-3 mb-1 rounded light-gray-bg">
              <h6 className="text-xs text-[#005798] font-bold pl-2">
                CONTEXT:
              </h6>
              {/* <SelectBetweenImages /> */}
              <AnnotationContextStrategy
                config={taskContextInfo.context_info.context as any}
                task={{}}
                context={taskContextInfo?.current_context}
                onInputChange={updateModelInputs}
              />
            </div>
            <div id="inputUser" className="p-3">
              <AnnotationUserInputStrategy
                config={taskContextInfo?.context_info.user_input as any}
                task={{}}
                onInputChange={updateModelInputs}
              />
            </div>
            <div id="responseInfo" className="max-h-96">
              {modelOutput && (
                <ResponseInfo
                  label={modelOutput.label}
                  input={modelOutput.input}
                  prediction={modelOutput.prediction}
                  probabilities={modelOutput.probabilities}
                  fooled={modelOutput.fooled}
                />
              )}
            </div>
            <div id="buttons">
              {taskContextInfo && (
                <AnnotationButtonActions
                  modelInTheLoop={modelInTheLoop}
                  contextId={taskContextInfo?.context_id}
                  tags={taskContextInfo?.tags}
                  realRoundId={taskContextInfo?.real_round_id}
                  currentContext={taskContextInfo?.current_context}
                  modelInputs={modelInputs}
                  taskID={3}
                  inputByUser={
                    taskContextInfo?.context_info?.response_fields
                      ?.input_by_user
                  }
                  modelPredictionLabel={
                    taskContextInfo?.context_info.model_output
                      ?.model_prediction_label
                  }
                  setModelOutput={setModelOutput}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CreateInterface;
