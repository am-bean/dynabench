import React, { FC, useEffect, useState, useContext } from "react";
import { Button } from "react-bootstrap";
import { TokenAnnotator } from "react-text-annotate";
import useFetch from "use-http";
import { PacmanLoader } from "react-spinners";
import Swal from "sweetalert2";

import { ContextConfigType } from "new_front/types/createSamples/createSamples/annotationContext";
import { ContextAnnotationFactoryType } from "new_front/types/createSamples/createSamples/annotationFactory";

import AnnotationInstruction from "new_front/components/OverlayInstructions/Annotation";
import DropdownSearch from "new_front/components/Inputs/DropdownSearch";

import generateLightRandomColor from "new_front/utils/helpers/functions/GenerateRandomLightColor";

type MultipleTagsTypes = {
  preselectedTag?: string;
};

type Dictionary = { [key: string]: any };

const cleanUpSelection = (
  selection: Array<Dictionary>,
  keyToRemove: string,
) => {
  const result: Array<Record<string, any>> = [];

  selection.forEach((dictionary) => {
    const newDictionary: Dictionary = {};

    for (const key in dictionary) {
      if (dictionary.hasOwnProperty(key) && key !== keyToRemove) {
        newDictionary[key] = dictionary[key];
      }
    }

    result.push(newDictionary);
  });

  return result;
};

const SelectMultipleTextMultipleTags: FC<
  ContextAnnotationFactoryType & ContextConfigType & MultipleTagsTypes
> = ({
  field_names_for_the_model,
  instruction,
  userId,
  taskId,
  generative_context,
}) => {
  const { post, loading, response } = useFetch();

  const [selectionInfo, setSelectionInfo] = useState<any>([]);
  const [localTags, setLocalTags] = useState<any>([]);
  const [tagSelection, setTagSelection] = useState<any>(null);
  const [tagColors, setTagColors] = useState<any>(undefined);
  const [preferedTag, setPreferedTag] = useState<any>(null);
  const [text, setText] = useState<string | undefined>(undefined);
  const [contextId, setContextId] = useState<number | null>(null);
  const [realRoundId, setRealRoundId] = useState<number | null>(null);

  const submitButton: HTMLElement | null = document.getElementById("submit");

  useEffect(() => {
    const tempTags: any[] = [];
    const colors: string[] = [];
    const tempTagColors: any = {};
    generative_context?.artifacts?.tags?.forEach((tag: any) => {
      let color = generateLightRandomColor();
      while (colors.includes(color)) {
        color = generateLightRandomColor();
      }
      colors.push(color);
      tempTags.push({
        value: tag?.display_label,
        color: color,
        back_label: tag?.back_label,
      });
      tempTagColors[tag.back_label] = color;
    });
    setLocalTags(tempTags);
    setTagColors(tempTagColors);
    if (field_names_for_the_model?.preselected_tag) {
      setPreferedTag(field_names_for_the_model.preselected_tag);
    }
  }, []);

  useEffect(() => {
    if (preferedTag) {
      setTagSelection(localTags.find((tag: any) => tag.value === preferedTag));
      handleSubmit(
        localTags.find((tag: any) => tag.value === preferedTag)?.back_label,
      );
    }
  }, [preferedTag]);

  const handleSubmit = async (value: string | null) => {
    !value && (value = tagSelection.back_label);
    submitButton && (submitButton.hidden = false);
    const bringContext = await post(
      "/context/get_random_context_from_key_value/",
      {
        key_name: field_names_for_the_model?.tag_name_search,
        key_value: value,
      },
    );
    if (response.ok) {
      !bringContext &&
        Swal.fire({
          title: instruction?.context_alert_title,
          text: instruction?.context_alert_text,
          icon: "warning",
          confirmButtonText: "Ok",
        }).then(() => {
          handleSubmit(field_names_for_the_model?.default_tag);
        });
      console.log("bringContext", bringContext);
      setText(bringContext?.content);
      setContextId(bringContext?.id);
      setRealRoundId(bringContext?.round_id);
    }
  };

  const handleSelectAll = async () => {
    const tokens = text?.split(" ");
    setSelectionInfo([
      {
        start: 0,
        end: tokens?.length,
        tag: tagSelection.back_label,
        tokens: tokens,
        color: tagColors[tagSelection.back_label],
      },
    ]);
  };

  const handleSubmitExample = async () => {
    const newSelectionInfo = cleanUpSelection(selectionInfo, "color");
    const response = await post("/example/create_example/", {
      context_id: contextId,
      user_id: userId,
      input_json: { labels: newSelectionInfo },
      text: text,
      task_id: taskId,
      round_id: realRoundId,
      increment_context: true,
    });
    if (response.ok) {
      Swal.fire({
        title: "Success",
        text: "The data has been saved",
        icon: "success",
        confirmButtonText: "Ok",
      }).then(() => {
        handleSubmit(null);
      });
    }
  };

  const handleChange = (value: any) => {
    setSelectionInfo(value);
  };

  return (
    <AnnotationInstruction
      placement="top"
      tooltip={
        instruction?.tooltip ||
        "Select the tag and the text according to the tag"
      }
    >
      {!text ? (
        <>
          {!loading ? (
            <div className="mt-8">
              {instruction?.preselection && (
                <div className="pb-4 text-l font-bold">
                  {instruction?.preselection}
                </div>
              )}
              <DropdownSearch
                options={localTags}
                value={
                  tagSelection?.value ||
                  `Select a ${instruction?.tag_name || "tag"}`
                }
                onChange={setTagSelection}
              />
              <div className="col-span-1 pl-2 pr-3" id="select">
                <Button
                  className="border-0 font-weight-bold light-gray-bg task-action-btn"
                  onClick={() => handleSubmit(null)}
                  disabled={!tagSelection}
                >
                  Select
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid items-center justify-center h-32 grid-rows-2">
              <div className="mr-2 text-letter-color mb-5">
                Data is being prepared, please wait...
              </div>
              <PacmanLoader color="#ccebd4" loading={loading} size={50} />
            </div>
          )}
        </>
      ) : (
        <>
          <div className="p-2 rounded">
            <div className="grid grid-cols-6">
              {instruction?.selection_note && (
                <div className="pb-4 text-l font-bold col-span-8">
                  {instruction?.selection_note}
                </div>
              )}
              <div className="mx-auto mb-4 col-start-10">
                <Button
                  className="border-0 font-weight-bold light-gray-bg task-action-btn"
                  onClick={() => handleSelectAll()}
                >
                  Select all text area
                </Button>
              </div>
            </div>
            <TokenAnnotator
              tokens={text.split(" ")}
              value={selectionInfo}
              onChange={(value) => handleChange(value)}
              getSpan={(span) => ({
                ...span,
                tag: tagSelection.back_label,
                color: tagColors[tagSelection.back_label],
              })}
              renderMark={(props) => (
                <mark
                  key={props.key}
                  onClick={() =>
                    props.onClick({
                      start: props.start,
                      end: props.end,
                      tag: props.tag,
                      color: props.color,
                      content: props.content,
                    })
                  }
                  style={{
                    padding: ".2em .3em",
                    margin: "0 .25em",
                    lineHeight: "1",
                    display: "inline-block",
                    borderRadius: ".25em",
                    background: tagColors[props.tag],
                  }}
                >
                  {props.content}{" "}
                  <span
                    style={{
                      boxSizing: "border-box",
                      content: "attr(data-entity)",
                      fontSize: ".55em",
                      lineHeight: "1",
                      padding: ".35em .35em",
                      borderRadius: ".35em",
                      textTransform: "uppercase",
                      display: "inline-block",
                      verticalAlign: "middle",
                      margin: "0 0 .15rem .5rem",
                      background: "#fff",
                      fontWeight: "700",
                    }}
                  >
                    {" "}
                    {props.tag}
                  </span>
                </mark>
              )}
            />
          </div>
          <div className="mt-8 gap-4">
            <div>
              <DropdownSearch
                options={localTags}
                value={
                  tagSelection?.value ||
                  `Select a ${
                    field_names_for_the_model?.tag_name_for_display || "tag"
                  }`
                }
                onChange={setTagSelection}
              />
            </div>
          </div>
          <div className="mt-8 pag-4">
            <div className="mx-auto mb-4 col-start-10">
              <Button
                className="border-0 font-weight-bold light-gray-bg task-action-btn"
                onClick={() => handleSubmitExample()}
                disabled={!selectionInfo.length}
              >
                Submit
              </Button>
            </div>
          </div>
        </>
      )}
    </AnnotationInstruction>
  );
};

export default SelectMultipleTextMultipleTags;
