import React, { useContext, useEffect, useState } from "react";
import Swal from "sweetalert2";

import useUploadFile from "./useUploadFile";
import CreateModel from "new_front/pages/SubmitModel/CreateModel";
import { Button } from "react-bootstrap";
import ProgressBar from "new_front/components/Buttons/ProgressBar";
import UserContext from "containers/UserContext";
import { checkUserIsLoggedIn } from "new_front/utils/helpers/functions/LoginFunctions";
import { useHistory, useParams } from "react-router-dom";
import useFetch from "use-http";
const yaml = require("js-yaml");

const SubmitModel = () => {
  const [loading, setLoading] = useState({
    loading: true,
    text: "Done",
  });
  const [loadingFile, setLoadingFile] = useState(false);
  const { progress, sendModelData } = useUploadFile();
  const [showHuggingFace, setShowHuggingFace] = useState(false);
  const [showDynalab, setShowDynalab] = useState(false);
  const [hfModel, setHfModel] = useState(false);
  const [languagePairs, setLanguagePairs] = useState<any>();
  const [configYaml, setConfigYaml] = useState<any>();
  const { user } = useContext(UserContext);
  const history = useHistory();
  let { taskCode } = useParams<{ taskCode: string }>();
  const { get, response } = useFetch();

  const isLogin = async (taskCode: string) => {
    if (!user.id) {
      await checkUserIsLoggedIn(history, `/`, null, taskCode);
    }
  };
  const handleSubmitModel = (modelData: any) => {
    if (modelData.file.length !== 0) {
      setLoading({
        loading: false,
        text: "Your model is being uploaded.",
      });
      const formData = new FormData();
      formData.append("model_name", modelData.modelName);
      formData.append("description", modelData.desc);
      formData.append("num_paramaters", modelData.numParams);
      formData.append("languages", modelData.languages);
      formData.append("license", modelData.license);
      formData.append("file_name", modelData.file.name);
      formData.append("user_id", user.id);
      formData.append("task_code", taskCode);
      formData.append("file_to_upload", modelData.file);
      sendModelData(formData).then(() => {
        setLoading({ loading: true, text: "Done" });
        Swal.fire({
          title: "Good job!",
          text: "Your model will be uploaded and soon you will be able to see the results in the dynaboard (you will receive an email!)",
          icon: "success",
          confirmButtonColor: "#007bff",
        });
      });
    } else {
      setLoadingFile(true);
      alert("Please upload a model");
      setLoading({ loading: true, text: "Done" });
    }
  };
  const getTaskData = async () => {
    const taskId = await get(`/task/get_task_id_by_task_code/${taskCode}`);
    const taskData = await get(
      `/task/get_task_with_round_info_by_task_id/${taskId}`,
    );
    if (response.ok) {
      setConfigYaml(
        JSON.parse(JSON.stringify(yaml.load(taskData.config_yaml))),
      );
    }
  };

  useEffect(() => {
    isLogin(taskCode);
    if (user.id) {
      getTaskData();
    }
  }, [user]);

  useEffect(() => {
    if (configYaml) {
      if (configYaml.submit_config) {
        if (configYaml.submit_config.allow_hf) {
          setHfModel(configYaml.submit_config.allow_hf);
        }
        if (configYaml.submit_config.languages_options) {
          setLanguagePairs(configYaml.submit_config.languages_options);
        }
      } else {
        setHfModel(false);
      }
    }
  }, [configYaml]);

  return (
    <>
      {loading.loading && configYaml ? (
        <div className="container">
          <div className="flex flex-col items-center justify-center pt-8">
            <h1 className="text-3xl font-bold">Submit Model</h1>
            <p className="pt-3 text-lg">
              What type of model do you want to upload?
            </p>
          </div>
          <div
            className={`grid gap-6 ${hfModel ? "grid-cols-2" : "grid-cols-1"}`}
          >
            {hfModel && (
              <div className="flex flex-col items-center justify-center mt-4 border-2 border-gray-200 rounded-md">
                <h3 className="pt-4 text-xl font-semibold">Hugging Face 🤗</h3>
                <p className="text-lg">Upload a model from Hugging Face</p>
                <span className="pt-2 pb-4 text-gray-400">
                  Here you can find the instructions to upload a model from
                  Hugging Face
                </span>
                {showHuggingFace ? (
                  <CreateModel
                    isDynalab={false}
                    handleClose={() => setShowHuggingFace(false)}
                    handleSubmitModel={handleSubmitModel}
                  />
                ) : (
                  <Button
                    onClick={() => setShowHuggingFace(!showHuggingFace)}
                    className="mb-4 border-0 font-weight-bold light-gray-bg btn-primary"
                  >
                    <i className="fas fa-edit "></i> Upload model
                  </Button>
                )}
              </div>
            )}
            <div className="flex flex-col items-center justify-center mt-4 border-2 border-gray-200 rounded-md">
              <h3 className="pt-4 text-xl font-semibold">Dynalab</h3>
              <p className="text-lg">Upload a Dynalab model</p>
              <span className="pt-2 pb-4 text-gray-400">
                Here you can find the instructions to create a Dynalab model
              </span>
              {showDynalab ? (
                <CreateModel
                  isDynalab={true}
                  languagePairs={languagePairs}
                  handleClose={() => setShowDynalab(false)}
                  handleSubmitModel={handleSubmitModel}
                />
              ) : (
                <Button
                  onClick={() => setShowDynalab(!showDynalab)}
                  className="mb-4 border-0 font-weight-bold light-gray-bg btn-primary"
                >
                  <i className="fas fa-edit "></i> Upload model
                </Button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center h-screen">
          <ProgressBar progress={progress} text={loading.text} />
        </div>
      )}
    </>
  );
};

export default SubmitModel;
