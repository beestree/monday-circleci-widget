import React from "react";
import "./App.css";
import MaterialIcon from 'material-icons-react';
import Tilt from 'react-tilt';
import ReactCardFlip from 'react-card-flip';
import mondaySdk from "monday-sdk-js";
const monday = mondaySdk();

const errorMessages = {
    default: {text: "Something went wrong, please check the logs", explanation: ""},
    unauthorized: {text: "You are unauthorized. Please enter a valid CircleCI API token.", explanation: "Go to CircleCI and log in. Then click on your profile on the bottom left and go to \"Personal API Tokens\". Create a new API Token and enter it here at \"CircleCI API token\" in the settings."},
    bad_request: {text: "Error 400: Bad request", explanation: ""},
    no_org_slug: {text: "Please enter your VCS provider. This can be GitHub or BitBucket", explanation: ""},
    form_not_filled: {text: "Please fill in all fields", explanation: "Click the cog icon and fill in all fields to get started."},
    no_results: {text: "The server returned no results.", explanation: "Did you fill in all values correctly? A possible reason for this error could be that you entered the wrong VCS provider."},
    workflow_not_found: {text: "This workflow could not be found. Please check the name.", explanation: ""},
    project_not_found: {text: "This project could not be found. Please check the name.", explanation: ""}
};

const possibleErrors = {
    "You must log in first.": "You are unauthorized. Please enter a valid CircleCI API token.",
    "Organization not found": "Organization not found. Please check your organization name."
};

const badgeIcons = {
    canceled: "remove_circle_outline",
    failed: "error_outline",
    success: "check_circle_outline"
};

class App extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            settings: {},
            name: "",
            errorMessageEnabled: false,
            errorMessage: "",
            errorExplanation: "",
            projects: {},
            errorFlipped: false
        };

        this.flipCard = this.flipCard.bind(this);
        this.selectProject = this.selectProject.bind(this);
        this.saveSelectedProject = this.saveSelectedProject.bind(this);
        this.selectWorkflow = this.selectWorkflow.bind(this);
        this.saveSelectedWorkflow = this.saveSelectedWorkflow.bind(this);
        this.displayMessage = this.displayMessage.bind(this);
    }

    componentDidMount() {
        monday.listen("settings", res => {
            this.setState({settings: res.data});
        });
    }

    flipCard(e) {
        e.preventDefault();
        this.setState(prevState => ({ errorFlipped: !prevState.errorFlipped }));
    }

    selectProject(selectedProject) {
        if(this.state.selectedProject !== selectedProject) {
            this.setState({ selectedProject: selectedProject });
        } else {
            this.setState({ selectedProject: "" });
        }
    }

    saveSelectedProject(saveSelectedProject) {
        this.setState({ saveSelectedProject: saveSelectedProject });
    }

    selectWorkflow(selectedWorkflow) {
        if(this.state.selectedWorkflow !== selectedWorkflow) {
            this.setState({ selectedWorkflow: selectedWorkflow });
        } else {
            this.setState({ selectedWorkflow: "" });
        }
    }

    saveSelectedWorkflow(saveSelectedWorkflow) {
        this.setState({ saveSelectedWorkflow: saveSelectedWorkflow });
    }

    displayMessage(enabled, message="default", from_list=true) {
        if(from_list) {
            this.setState({errorMessageEnabled: enabled, errorMessage: errorMessages[message]['text'], errorExplanation: errorMessages[message]['explanation']});
        } else {
            this.setState({errorMessageEnabled: enabled, errorMessage: message, errorExplanation: ""});
        }
    }

    settingsComplete() {
        if(this.state.settings.vcs_provider === null || this.state.settings.organization_name.length === 0 || this.state.settings.project_name.length === 0 || this.state.settings.workflow_name.length === 0) {
            return false;
        } else {
            return true;
        }
    }

    componentDidUpdate(prevProps, prevState) {
        if(prevState.settings !== this.state.settings) {
            if(this.settingsComplete()) {
                fetch("https://circleci.com/api/v2/pipeline?circle-token="+this.state.settings.circleci_api_token+"&org-slug="+this.state.settings.vcs_provider+"/"+this.state.settings.organization_name, {
                    headers: {
                        'Accept': 'application/json'
                    }
                })
                    .then(res => {
                        if(res.status === 401) {
                            this.displayMessage(true, "unauthorized");
                        }
                        return res.json();
                    })
                    .then((data) => {
                        if(data.message in possibleErrors) {
                            this.displayMessage(true, possibleErrors[data.message], false);
                        } else {
                            if(data.items.length > 0) {
                                var pipelines = data.items;
                                this.setState({ projects: [] });
                                for(var pipeline in pipelines) {
                                    this.getWorkflow(pipelines[pipeline]);
                                }
                                this.displayMessage(false);
                            } else {
                                this.displayMessage(true, "no_results");
                            }
                        }
                    })
                    .catch(console.log);
            } else {
                this.displayMessage(true, "form_not_filled");
            }
        }
    }

    getWorkflow(pipeline) {
        fetch("https://circleci.com/api/v2/pipeline/"+pipeline.id+"/workflow?circle-token="+this.state.settings.circleci_api_token+"&org-slug="+this.state.settings.vcs_provider+"/"+this.state.settings.organization_name, {
            headers: {
                'Accept': 'application/json'
            }
        })
            .then(res => {
                return res.json();
            })
            .then((data) => {
                var projects = this.state.projects;
                if(!projects[pipeline.project_slug]) {
                    projects[pipeline.project_slug] = [];
                }
                for(var item in data.items) {
                    projects[pipeline.project_slug].push(data.items[item]);
                }
                this.setState({projects: projects});
            })
            .catch(console.log);
    }

    render() {
        if(this.state.errorMessageEnabled) {
            return <div className="App"><ErrorMessage message={this.state.errorMessage} explanation={this.state.errorExplanation} errorFlipped={this.state.errorFlipped} flipCard={this.flipCard}/></div>;
        } else {
            return <div className="app"><StatusBadge settings={this.state.settings} projects={this.state.projects} /></div>;
        }
    };
}

class ErrorMessage extends React.Component {
    render() {
        return <Tilt className="Tilt" options={{ max: 20 }}>
            <ReactCardFlip isFlipped={this.props.errorFlipped && this.props.explanation.length > 0}>
            <div onClick={this.props.flipCard} className="Tilt-inner error_message_wrapper">
            <p className="error_message_title">Error</p>
            <p className="error_message_message">{this.props.message}</p>
            <img alt="Error" className="error_message_exclamation_mark" src="/exclamation_mark.png" />
            </div>
            <div onClick={this.props.flipCard} className="Tilt-inner error_message_wrapper">
            <p className="error_explanation">{this.props.explanation}</p>
            </div>
            </ReactCardFlip>
            </Tilt>;
    }
}

class StatusBadge extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            status: "",
            errorMessageEnabled: false,
            errorMessage: "",
            errorExplanation: ""
        };

        this.displayMessage = this.displayMessage.bind(this);
        this.getStatus = this.getStatus.bind(this);
    }

    componentDidMount() {
    }

    componentDidUpdate(prevProps, prevState) {
        this.getStatus(prevProps, prevState);
    }

    displayMessage(enabled, message="default", from_list=true) {
        if(from_list) {
            this.setState({errorMessageEnabled: enabled, errorMessage: errorMessages[message]['text'], errorExplanation: errorMessages[message]['explanation']});
        } else {
            this.setState({errorMessageEnabled: enabled, errorMessage: message});
        }
    }

    getStatus(prevProps, prevState) {
        var project_slug = this.props.settings.vcs_provider + "/" + this.props.settings.organization_name + "/" + this.props.settings.project_name;
        var project = this.props.projects[project_slug];
        if(project === undefined) {
            if(prevProps.settings !== this.props.settings) {
                this.displayMessage(true, "project_not_found");
            }
            return;
        } else {
            var workflow = project.find(workflow => workflow.name === this.props.settings.workflow_name);
            if(workflow === undefined) {
                if(prevProps.settings !== this.props.settings) {
                    this.displayMessage(true, "workflow_not_found");
                }
            } else {
                if(this.state.errorMessageEnabled) {
                    this.displayMessage(false);
                }
                if(this.state.status !== workflow.status) {
                    this.setState({ status: workflow.status });
                }
            }
        }
    }

    render() {
        if(this.state.errorMessageEnabled) {
            return <div className="App"><ErrorMessage message={this.state.errorMessage} explanation={this.state.errorExplanation} errorFlipped={this.state.errorFlipped} flipCard={this.flipCard}/></div>;
        } else {
            return <div className="App"><Badge status={this.state.status} /></div>;
        }
    }
}

class Badge extends React.Component {
    render() {
        return <Tilt className="Tilt"><div className={"status_badge_wrapper status_" + this.props.status}><div className="status_badge_icon"><MaterialIcon icon={badgeIcons[this.props.status]} color="#FFF" /></div><p className="status_badge_text">{this.props.status}</p></div></Tilt>;
    }
}

export default App;
