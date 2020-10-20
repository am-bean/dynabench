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
  DropdownButton,
  Dropdown,
  Modal,
  Form
} from "react-bootstrap";
import UserContext from "./UserContext";
import {
  OverlayProvider,
  BadgeOverlay,
  Annotation
} from "./Overlay"

class VerifyInterface extends React.Component {
  static contextType = UserContext;
  constructor(props) {
    super(props);
    this.state = {
      taskId: null,
      task: {},
      example: {},
      owner_mode: false,
      ownerValidationFlagFilter: "Any",
      ownerValidationDisagreementFilter: "Any",
    };
    this.getNewExample = this.getNewExample.bind(this);
    this.handleResponse = this.handleResponse.bind(this);
    this.setRangesAndGetRandomFilteredExample = this.setRangesAndGetRandomFilteredExample.bind(this);
    this.updateUserSettings = this.updateUserSettings.bind(this);
    this.updateOwnerValidationFlagFilter = this.updateOwnerValidationFlagFilter.bind(this);
    this.updateOwnerValidationDisagreementFilter = this.updateOwnerValidationDisagreementFilter.bind(this);
  }
  componentDidMount() {
    const {
      match: { params },
    } = this.props;
    if (!this.context.api.loggedIn()) {
      this.props.history.push(
        "/login?msg=" +
          encodeURIComponent(
            "Please log in or sign up so that you can get credit for your generated examples."
          ) +
          "&src=" +
          encodeURIComponent("/tasks/" + params.taskId + "/create")
      );
    }

    if (this.context.user.settings_json) {
      const settings_json = JSON.parse(this.context.user.settings_json);
      if (settings_json.hasOwnProperty('owner_validation_flag_filter')) {
        this.setState({ ownerValidationFlagFilter: settings_json['owner_validation_flag_filter'] });
      }
      if (settings_json.hasOwnProperty('owner_validation_disagreement_filter')) {
        this.setState({ ownerValidationDisagreementFilter: settings_json['owner_validation_disagreement_filter'] });
      }
    }

    this.setState({ taskId: params.taskId }, function () {
      this.context.api
        .getTask(this.state.taskId)
        .then((result) => {
          result.targets = result.targets.split("|"); // split targets
          this.setState({ task: result }, function () {
            this.state.task.selected_round = this.state.task.cur_round;
            this.getNewExample();
          });
        }, (error) => {
          console.log(error);
          if (error.status_code === 404 || error.status_code === 405) {
            this.props.history.push("/");
          }
        });
    });
  }

  getNewExample() {
    (this.state.owner_mode
      ? this.setRangesAndGetRandomFilteredExample()
      : this.context.api.getRandomExample(this.state.taskId, this.state.task.selected_round))
      .then((result) => {
        if (this.state.task.type !== 'extract') {
          result.target = this.state.task.targets[parseInt(result.target_pred)];
        }
        this.setState({
          example: result,
        });
      }, (error) => {
        console.log(error);
        this.setState({
          example: false
        });
      });
  }
  handleResponse(action) {
    var action_label = null;
    switch(action) {
      case 'correct':
        action_label = 'correct';
        break;
      case 'incorrect':
        action_label = 'incorrect';
        break;
      case 'flag':
        action_label = 'flagged';
        break;
    }
    if (action_label !== null) {
      const mode = this.state.owner_mode ? "owner" : "user";
      this.context.api.validateExample(this.state.example.id, action_label, mode)
        .then((result) => {
          this.getNewExample();
          if (!!result.badges) {
            this.setState({showBadges: result.badges})
          }
        }, (error) => {
          console.log(error);
        });
    }
  }

  setRangesAndGetRandomFilteredExample() {
    var minNumFlags;
    var maxNumFlags;
    var minNumDisagreements;
    var maxNumDisagreements;

    if (this.state.ownerValidationFlagFilter === "Any") {
      minNumFlags = 0;
      maxNumFlags = 5;
    } else {
      minNumFlags = this.state.ownerValidationFlagFilter;
      maxNumFlags = this.state.ownerValidationFlagFilter;
    }

    if (this.state.ownerValidationDisagreementFilter === "Any") {
      minNumDisagreements = 0;
      maxNumDisagreements = 4;
    } else {
      minNumDisagreements = this.state.ownerValidationDisagreementFilter;
      maxNumDisagreements = this.state.ownerValidationDisagreementFilter;
    }

    return this.context.api.getRandomFilteredExample(
      this.state.taskId, this.state.task.selected_round,
      minNumFlags, maxNumFlags, minNumDisagreements, maxNumDisagreements);
  }

  updateUserSettings(key, value) {
    var settings_json;
    if (this.context.user.settings_json) {
      settings_json = JSON.parse(this.context.user.settings_json);
    } else {
      settings_json = {};
    }
    settings_json[key] = value;
    this.context.user.settings_json = JSON.stringify(settings_json);
    this.context.api.updateUser(this.context.user.id, this.context.user);
  }

  updateOwnerValidationFlagFilter(value) {
    this.updateUserSettings('owner_validation_flag_filter', value);
    this.setState({ ownerValidationFlagFilter: value }, () => {
      this.getNewExample();
    });
  }

  updateOwnerValidationDisagreementFilter(value) {
    this.updateUserSettings('owner_validation_disagreement_filter', value);
    this.setState({ ownerValidationDisagreementFilter: value }, () => {
      this.getNewExample();
    });
  }

  render() {
    return (
      <OverlayProvider initiallyHide={true}>
        <BadgeOverlay
          badgeTypes={this.state.showBadges}
          show={!!this.state.showBadges}
          onHide={() => this.setState({showBadges: ""})}
        >
        </BadgeOverlay>
        <Container className="mb-5 pb-5">
          <Col className="m-auto" lg={12}>
            {this.context.api.isTaskOwner(this.context.user, this.state.task.id) || this.context.user.admin
              ? <div style={{float: "right"}}>
                  <Annotation placement="top" tooltip="Click to adjust your owner validation filters">
                    <button type="button" className="btn btn-outline-primary btn-sm btn-help-info"
                      onClick={() => { this.setState({showOwnerValidationFiltersModal: true}) }}
                    ><i className="fa fa-cog"></i></button>
                  </Annotation>
                  <Modal
                    show={this.state.showOwnerValidationFiltersModal}
                    onHide={() => this.setState({showOwnerValidationFiltersModal: false})}
                    >
                      <Modal.Header closeButton>
                        <Modal.Title>Owner Validation Filters</Modal.Title>
                      </Modal.Header>
                      <Modal.Body>
                        <Form.Check
                          checked={this.state.owner_mode}
                          label="Enter task owner mode?"
                          onChange={() => {
                              this.setState({ owner_mode: !this.state.owner_mode },
                              this.componentDidMount()
                            );}
                          }
                        />
                        {this.state.owner_mode
                          ? <div>
                              <DropdownButton variant="light" className="p-1" title={this.state.ownerValidationFlagFilter.toString() + " flag" + (this.state.ownerValidationFlagFilter === 1 ? "" : "s")}>
                                {["Any",0,1,2,3,4,5].map((target, index) => <Dropdown.Item onClick={() => this.updateOwnerValidationFlagFilter(target)} key={index} index={index}>{target}</Dropdown.Item>)}
                              </DropdownButton>
                              <DropdownButton variant="light" className="p-1" title={this.state.ownerValidationDisagreementFilter.toString() + " correct/incorrect disagreement" + (this.state.ownerValidationDisagreementFilter === 1 ? "" : "s")}>
                                {["Any",0,1,2,3,4].map((target, index) => <Dropdown.Item onClick={() => this.updateOwnerValidationDisagreementFilter(target)} key={index} index={index}>{target}</Dropdown.Item>)}
                              </DropdownButton>
                            </div>
                          : ""
                        }
                      </Modal.Body>
                  </Modal>
                </div>
              : ""}
            <div className="mt-4 mb-5 pt-3">
              <p className="text-uppercase mb-0 spaced-header">{this.props.taskName}</p>
              <h2 className="task-page-header d-block ml-0 mt-0 text-reset">
                Validate examples
              </h2>
              <p>
                If a model was fooled, we need to make sure that the example is correct.
              </p>
            </div>
            {this.state.task.shortname === "Hate Speech" ?
              <p className="mt-3 p-3 light-red-bg rounded white-color"><strong>WARNING</strong>: This is sensitive content! If you do not want to see any hateful examples, please switch to another task.</p>
              : null
            }
            <Card className="profile-card overflow-hidden">
              <div className="mb-1 p-3 light-gray-bg">
                <h6 className="text-uppercase dark-blue-color spaced-header">Context:</h6>
                {this.state.example.context && this.state.example.context.context.replace("<br>", "\n")}
              </div>
              <Card.Body className="overflow-auto pt-2" style={{ height: 400 }}>
                <Card
                  className="hypothesis rounded border m-3 card"
                  style={{ minHeight: 120 }}
                >
                {this.state.example ?
                  <>
                  <Card.Body className="p-3">
                    <Row>
                      <Col xs={12} md={7}>
                        {this.state.task.type == "extract" ?
                          <div className="mb-3">
                            <h6 className="text-uppercase dark-blue-color spaced-header">
                            Question:
                            </h6>
                            <p>
                            {this.state.example.text}
                            </p>
                            <h6 className="text-uppercase dark-blue-color spaced-header">
                            Answer:
                            </h6>
                            <p>
                            {this.state.example.target_pred}
                            </p>
                          </div>
                          :
                          <div className="mb-3">
                            <h6 className="text-uppercase dark-blue-color spaced-header">
                            {this.state.task.shortname === "NLI" ? "Hypothesis" : "Statement"}:
                            </h6>
                            <p>
                            {this.state.example.text}
                            </p>
                            <h6 className="text-uppercase dark-blue-color spaced-header">
                            Label:
                            </h6>
                            <p>
                            {this.state.example.target}
                            </p>
                            {this.state.example.example_explanation ?
                              <>
                                <h6 className="text-uppercase dark-blue-color spaced-header">
                                Example explanation <small>(why target label is correct)</small>
                                </h6>
                                <p>
                                {this.state.example.example_explanation}
                                </p>
                              </>
                              : ""
                            }
                            {this.state.example.model_explanation ?
                              <>
                                <h6 className="text-uppercase dark-blue-color spaced-header">
                                Model explanation <small>({this.state.example.model_wrong ? "why model was fooled" : "how they tried to trick the model"})</small>
                                </h6>
                                <p>
                                {this.state.example.model_explanation}
                                </p>
                              </>
                              : ""
                            }
                            {this.state.example.metadata_json
                              ? JSON.parse(this.state.example.metadata_json).hasOwnProperty('hate_type')
                                ? <>
                                    <h6 className="text-uppercase dark-blue-color spaced-header">
                                    Hate Target:
                                    </h6>
                                    <p>
                                    {JSON.parse(this.state.example.metadata_json).hate_type}
                                    </p>
                                  </>
                                : ""
                              : ""
                            }
                          </div>
                        }
                      </Col>
                    </Row>
                  </Card.Body>
                  <Card.Footer>
                    <button
                      data-index={this.props.index}
                      onClick={() => this.handleResponse("correct")}
                      type="button"
                      className="btn btn-light btn-sm">
                        <i className="fas fa-thumbs-up"></i> {this.state.owner_mode ? "Verified " : ""} Correct
                    </button>{" "}
                    <button
                      data-index={this.props.index}
                      onClick={() => this.handleResponse("incorrect")}
                      type="button"
                      className="btn btn-light btn-sm">
                        <i className="fas fa-thumbs-down"></i> {this.state.owner_mode ? "Verified " : ""} Incorrect
                    </button>{" "}
                    {this.state.owner_mode ?
                      ""
                      : <button
                          data-index={this.props.index}
                          onClick={() => this.handleResponse("flag")}
                          type="button"
                          className="btn btn-light btn-sm">
                            <i className="fas fa-flag"></i> Flag
                        </button>
                    }{" "}
                    <button
                      data-index={this.props.index}
                      onClick={this.getNewExample}
                      type="button"
                      className="btn btn-light btn-sm pull-right">
                        <i className="fas fa-undo-alt"></i> Skip and load new example
                    </button>
                  </Card.Footer>
                  </>
                  :
                  <Card.Body className="p-3">
                    <Row>
                      <Col xs={12} md={7}>
                        <p>No more examples to be verified. Please create more examples!</p>
                      </Col>
                    </Row>
                  </Card.Body>
                }
                </Card>
                <div className="p-2">
                {this.state.owner_mode ?
                    <p style={{'color': 'red'}}>WARNING: You are in "Task owner mode." You can verify examples as correct or incorrect without input from anyone else!!</p>
                  : ''}
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Container>
      </OverlayProvider>
    );
  }
}

export default VerifyInterface;
