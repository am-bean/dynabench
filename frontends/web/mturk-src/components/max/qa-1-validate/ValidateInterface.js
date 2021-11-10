/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from "react";
import {
  Container,
  Row,
  Col,
  Card,
  InputGroup,
  Button,
  FormControl,
  Spinner,
} from "react-bootstrap";
import { FaInfoCircle, FaThumbsUp, FaThumbsDown, FaFlag, FaBorderNone, FaTruckLoading } from "react-icons/fa";

import { TokenAnnotator, TextAnnotator } from "react-text-annotate";

import "./ValidateInterface.css";

class ContextInfo extends React.Component {
  constructor(props) {
    super(props);
  }
  render() {
    return (
      <>
        <TokenAnnotator
          id="tokenAnnotator"
          className="mb-1 p-3 light-gray-bg qa-context"
          tokens={this.props.text.split(/\b|(?<=[\s\(\)])|(?=[\s\(\)])/)}
          value={this.props.answer}
          onChange={(e) => void 0}
        />
      </>
    );
  }
}

class ValidateInterface extends React.Component {
  constructor(props) {
    super(props);
    this.api = props.api;
    this.batchAmount = 10;
    this.userMode = "user";
    this.interfaceMode = "mturk";
    this.VALIDATION_STATES = {
      CORRECT: "correct",
      INCORRECT: "incorrect",
      VALID: "valid",
      INVALID: "invalid",
      FLAGGED: "flagged",
      UNKNOWN: "unknown",
    };
    this.state = {
      taskId: null,
      task: {},
      example: {},
      comment: {},
      curQId: 0,
      action: null,
      actionLabel: null,
      humanAnsValid: false,
      processingResponse: false,
      processedFirstExample: false,
      loadingNewExample: true,
      showNext: false,
    };
    this.getNewExample = this.getNewExample.bind(this);
    this.handleResponse = this.handleResponse.bind(this);
    this.handleNextExample = this.handleNextExample.bind(this);
    this.setComment = this.setComment.bind(this);
    this.handleTaskSubmit = this.handleTaskSubmit.bind(this);
  }
  componentDidMount() {
    this.setState({ taskId: this.props.taskConfig.task_id }, function () {
      this.api.getTask(this.state.taskId).then(
        (result) => {
          // console.log("Loaded task: ");
          // console.log(result);
          this.setState({ task: result }, function () {
            this.state.task.selected_round = this.state.task.cur_round;
            this.getNewExample();
          });
        },
        (error) => {
          console.log(error);
        }
      );
    });
  }
  setComment(e) {
    this.setState({ comment: e.target.value });
  }
  getNewExample() {
    this.setState(
      {
        loadingNewExample: true,
      },
      () => {
        this.api.getRandomExample(
          this.state.taskId,
          this.state.task.cur_round,
          this.getTagList(this.props),
          [],
          this.props.providerWorkerId
        )
        .then(
          (result) => {
            console.log("Example: ");
            console.log(result);
            this.setState({
              example: result,
              curQId: this.state.curQId + 1,
              action: null,
              actionLabel: null,
              humanAnsValid: false,
              showNext: false,
              processingResponse: false,
              processedFirstExample: true,
            });
          },
          (error) => {
            // console.log("Error getting new example: ");
            // console.log(error);
            this.setState({
              example: {},
              action: null,
              actionLabel: null,
              humanAnsValid: false,
              showNext: false,
              processingResponse: false,
              processedFirstExample: true,
            });
          }
        )
        .finally(
          () => {
            this.setState({
              loadingNewExample: false,
            });
          }
        )
      }
    )
  }

  getTagList(props) {
    if (props.taskConfig && props.taskConfig.fetching_tags) {
      return props.taskConfig.fetching_tags.split(",");
    } else {
      return [];
    }
  }

  handleResponse(action) {
    console.log("Processing action: " + action)

    if (action === "humanexample_valid") {
      this.setState({
        action: null,
        actionLabel: null,
        humanAnsValid: true,
        showNext: false,
      });
    } else {
      let humanAnsValid = false;
      if (action === "valid" || action === "invalid_aicorrect") {
        humanAnsValid = true;
      }

      let action_label = null;
      if (action === "valid") {
        action_label = "correct";
      } else if (action === "flagged") {
        action_label = "flagged";
      } else {
        action_label = "incorrect";
      }
      this.setState({
        action: action,
        actionLabel: action_label,
        humanAnsValid: humanAnsValid,
        showNext: true,
      });
    }
  }

  handleNextExample() {
    const metadata = {
      annotator_id: this.props.providerWorkerId,
      mephisto_id: this.props.mephistoWorkerId,
      agentId: this.props.agentId,
      assignmentId: this.props.assignmentId,
      validationState: this.state.action,
      actionLabel: this.state.actionLabel,
      example_tags: this.getTagList(this.props),
    };
    // console.log("Metadata:");
    // console.log(metadata);

    this.setState(
      {
        processingResponse: true,
      }, () => {
        this.api
          .validateExample(
            this.state.example.id,
            this.state.actionLabel,
            this.userMode,
            metadata,
            this.props.providerWorkerId
          )
          .then(
            (result) => {
              this.getNewExample();
            },
            (error) => {
              console.log(error);
              this.setState({
                processingResponse: false,
              })
            }
          );
      }
    )
  }

  handleTaskSubmit() {
    this.props.onSubmit(this.state);
  }

  render() {
    var content;
    if (this.state.example.context) {
      var example_metadata = JSON.parse(this.state.example.metadata_json);
      var exampleHistory = [];
      if ("exampleHistory" in example_metadata) {
        exampleHistory = JSON.parse(example_metadata.exampleHistory);
      }

      // Get last answer
      var ans_start = null;
      var ans_end = null;
      for (var i = exampleHistory.length - 1; i >= 0; i--) {
        let item = exampleHistory[i];
        if ("activityType" in item && item["activityType"] == "Answer changed") {
          var ans_start = item.answer[0].start;
          var ans_end = item.answer[0].end;
          break;
        } else if ("activityType" in item && item["activityType"] == "Generated a QA pair") {
          var ans_char_start = item.questionMetadata.metadata_gen.answer_start;
          var ans_char_end = item.questionMetadata.metadata_gen.answer_end;
          var tokens = JSON.parse(this.state.example.context.context_json).context.split(/\b|(?<=[\s\(\)])|(?=[\s\(\)])/);
          var char_to_token_map = [];
          for (let token_id = 0; token_id < tokens.length; token_id++) {
            for (var char_id = 0; char_id < tokens[token_id].length; char_id++) {
              char_to_token_map.push(token_id);
            }
          }
          var ans_start = char_to_token_map[ans_char_start];
          var ans_end = char_to_token_map[ans_char_end];
          break;
        }
      }

      var answer = []
      if (ans_start !== null) {
        answer = [{ start: ans_start, end: ans_end, tag: "ANS" }];
      }
      var human_ans = JSON.parse(this.state.example.input_json).answer;
      var model_ans = JSON.parse(this.state.example.output_json).answer;

      content = (
        <ContextInfo
          answer={answer}
          text={JSON.parse(this.state.example.context.context_json).context}
        />
      );
    }
    return (
      <Container className="mb-5 pb-5">
        <Row>
          <Col className="m-auto" lg={12}>
            {this.state.curQId > this.batchAmount ?
             (
              <>
                <p>Thank you for completing the HIT. You may now submit it by clicking below:</p>
                <p>
                  <Button
                    className="btn btn-primary btn-success mt-2 py-2"
                    onClick={this.handleTaskSubmit}
                  >
                    Submit HIT
                  </Button>
                </p>
              </>
            ) : (
              <Card className="profile-card overflow-hidden">
                <div className="p-3 light-gray-bg">
                  <h6 className="text-uppercase dark-blue-color spaced-header">
                    Context:
                  </h6>
                  <Card.Body>
                    {this.state.example.context ? (
                      content
                    ) : (
                      <>
                        <Spinner
                          className="mr-2"
                          animation="border"
                          role="status"
                          size="sm"
                        />
                        Loading...
                      </>
                    )}
                  </Card.Body>
                </div>

                {!this.state.processedFirstExample && this.state.loadingNewExample ? null : (
                  <Card.Body className="overflow-auto pt-2">
                    <Card>
                      {this.state.example.context ? (
                        <>
                          <Card.Body className="p-3">
                            <Row>
                              <Col xs={12}>
                                <div className="mb-2">
                                  <h6 className="text-uppercase dark-blue-color spaced-header">
                                    {this.state.processingResponse ? (
                                      <Spinner
                                        className="mr-2"
                                        animation="border"
                                        role="status"
                                        size="sm"
                                      />
                                    ) : null}
                                    Question {this.state.curQId} of {this.batchAmount}:
                                  </h6>
                                  <p className="mb-2"><i>Q</i>: <b>{JSON.parse(this.state.example.input_json).question}</b></p>
                                </div>
                              </Col>
                            </Row>
                            <p><i>A</i>: <span style={{background: "rgba(132, 210, 255, 0.6)"}}>{human_ans}</span></p>
                            <p><b>Is this example correct?</b> <small>(please refer to the instructions above if you are unsure)</small></p>
                            <div style={{display: "flex"}}>
                              <button
                                data-index={this.props.index}
                                onClick={() => this.handleResponse("humanexample_valid")}
                                type="button"
                                className="btn btn-success btn-sm flex-fill mr-2"
                                disabled={this.state.processingResponse}
                              >
                                <FaThumbsUp /> Valid
                              </button>{" "}

                              <button
                                data-index={this.props.index}
                                onClick={() => this.handleResponse("invalid_badquestion")}
                                type="button"
                                className="btn btn-warning btn-sm flex-fill mr-2"
                                disabled={this.state.processingResponse}
                              >
                                <FaThumbsDown /> Invalid: <br />Bad Question
                              </button>{" "}

                              <button
                                data-index={this.props.index}
                                onClick={() => this.handleResponse("invalid_badanswer")}
                                type="button"
                                className="btn btn-warning btn-sm flex-fill mr-2"
                                disabled={this.state.processingResponse}
                              >
                                <FaThumbsDown /> Invalid: <br />Bad Human Answer
                              </button>{" "}

                              <button
                                data-index={this.props.index}
                                onClick={() => this.handleResponse("invalid_multiplevalidanswers")}
                                type="button"
                                className="btn btn-warning btn-sm flex-fill mr-2"
                                disabled={this.state.processingResponse}
                              >
                                <FaThumbsDown /> Invalid: <br />Multiple Valid Answers
                              </button>{" "}

                              <button
                                data-index={this.props.index}
                                onClick={() => this.handleResponse("invalid_other")}
                                type="button"
                                className="btn btn-warning btn-sm flex-fill mr-2"
                                disabled={this.state.processingResponse}
                              >
                                <FaThumbsDown /> Invalid: <br />Other
                              </button>{" "}

                              <button
                                data-index={this.props.index}
                                onClick={() => this.handleResponse("flag")}
                                type="button"
                                className="btn btn-danger btn-sm flex-fill mr-2"
                                disabled={this.state.processingResponse}
                              >
                                <FaFlag /> Flag
                              </button>{" "}
                            </div>

                            {this.state.humanAnsValid ? (
                              <>
                                <p className="mt-4">The AI answered "<span style={{background: "rgba(0, 255, 162, 0.8)"}}>{model_ans}</span>". <b>Is the AI answer also correct?</b></p>
                                <div style={{display: "flex"}}>
                                  <button
                                    data-index={this.props.index}
                                    onClick={() => this.handleResponse("invalid_aicorrect")}
                                    type="button"
                                    className="btn btn-success btn-sm flex-fill mr-2 py-3"
                                    disabled={this.state.processingResponse}
                                  >
                                    <FaThumbsUp /> Yes, the AI answer is correct.
                                  </button>{" "}

                                  <button
                                    data-index={this.props.index}
                                    onClick={() => this.handleResponse("valid")}
                                    type="button"
                                    className="btn btn-warning btn-sm flex-fill mr-2 py-3"
                                    disabled={this.state.processingResponse}
                                  >
                                    <FaThumbsDown /> No, the AI answer is wrong.
                                  </button>{" "}
                                </div>
                              </>
                            ) : null }
                          </Card.Body>

                          {this.state.showNext ? (
                            <Card.Footer>
                              <button
                                onClick={() => this.handleNextExample()}
                                type="button"
                                className="btn btn-primary btn-sm mr-2 py-2"
                                disabled={this.state.processingResponse}
                              >
                                {this.state.processingResponse ? (
                                  <Spinner
                                    className="mr-2"
                                    animation="border"
                                    role="status"
                                    size="sm"
                                  />
                                ) : null}
                                Next Example
                              </button>{" "}

                            </Card.Footer>
                          ) : null }
                        </>
                      ) : (
                        <Card.Body className="p-3">
                          <Row>
                            <Col lg={12}>
                              {this.curQId > 0 ? (
                                <>
                                  <p>There are no more examples to be validated!</p>
                                  <p>Thank you for completing the HIT. You may now submit it by clicking below:</p>
                                  <p>
                                    <Button
                                      className="btn btn-primary btn-success mt-2 py-2"
                                      onClick={this.handleTaskSubmit}
                                    >
                                      Submit HIT
                                    </Button>
                                  </p>
                                </>
                              ) : (
                                this.state.processedFirstExample ? (
                                  <>
                                    <p>Sorry, there are currently no examples for validation.</p>
                                    <p>We may have more examples ready for validation in the coming days. Thank you for your patience.</p>
                                  </>
                                ) : null
                              )}
                            </Col>
                          </Row>
                        </Card.Body>
                      )}
                    </Card>
                  </Card.Body>
                )}
              </Card>
            )}
          </Col>
        </Row>
      </Container>
    );
  }
}

export { ValidateInterface };