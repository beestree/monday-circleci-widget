import React from "react";
import "./App.css";
import MaterialIcon from 'material-icons-react';
import Tilt from 'react-tilt';
import Skeleton from 'react-loading-skeleton';
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
            project_name: "",
            workflow_name: "",
            errorFlipped: false,
            theme: "light",
            edit_mode: false,
            loading: true
        };

        this.flipCard = this.flipCard.bind(this);
        this.selectProject = this.selectProject.bind(this);
        this.saveSelectedProject = this.saveSelectedProject.bind(this);
        this.selectWorkflow = this.selectWorkflow.bind(this);
        this.saveSelectedWorkflow = this.saveSelectedWorkflow.bind(this);
        this.stopLoading = this.stopLoading.bind(this);
        this.displayMessage = this.displayMessage.bind(this);
    }

    componentDidMount() {
        monday.listen("settings", res => {
            this.setState({settings: res.data, loading: true});
        });
        monday.listen("context", res => {
            this.setState({theme: res.data.theme, edit_mode: res.data.editMode});
        });
        //this.interval = setInterval(() => {
        //    if(this.state.theme === "light") {
        //        this.setState({ theme: "dark" });
        //    } else {
        //        this.setState({ theme: "light" });
        //    }
        //}, 1000);
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
        if(!enabled) {
            this.setState({ errorFlipped: false });
        }
    }

    stopLoading() {
        this.setState({ loading: false });
    }

    settingsComplete() {
        if(this.state.settings.vcs_provider === null || this.state.settings.organization_name.length === 0) {
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
                                if(!this.state.errorFlipped) {
                                    setTimeout(() => {
                                        this.setState({ errorFlipped: true });
                                    }, 3000);
                                }
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
            return <div className="App"><ErrorMessage message={this.state.errorMessage} explanation={this.state.errorExplanation} errorFlipped={this.state.errorFlipped} flipCard={this.flipCard} theme={this.state.theme}/></div>;
        } else {
            return <div className="app"><StatusBadge settings={this.state.settings} project_name={this.state.project_name} workflow_name={this.state.workflow_name} projects={this.state.projects} theme={this.state.theme} edit_mode={this.state.edit_mode} loading={this.state.loading} stopLoading={this.stopLoading} /></div>;
        }
    };
}

class ErrorMessage extends React.Component {
    render() {
        return <Tilt className={"Tilt-error " + (this.props.theme === "dark" ? "dark_mode" : "")} options={{ max: 20 }}>
            <ReactCardFlip isFlipped={this.props.errorFlipped && this.props.explanation.length > 0}>
            <div onClick={this.props.flipCard} className="error_message_wrapper">
            <p className="error_message_title">Error</p>
            <p className="error_message_message">{this.props.message}</p>
            <img alt="Error" className="error_message_exclamation_mark" src="/exclamation_mark.png" />
            </div>
            <div onClick={this.props.flipCard} className="error_message_wrapper">
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
            configEnabled: false,
            configType: "",
            workflows: [],
            project_name: "",
            workflow_name: ""
        };

        this.get_workflows = this.get_workflows.bind(this);
        this.displayConfig = this.displayConfig.bind(this);
        this.setProject = this.setProject.bind(this);
        this.setWorkflow = this.setWorkflow.bind(this);
        this.getStatus = this.getStatus.bind(this);
    }

    componentDidUpdate(prevProps, prevState) {
        this.getStatus(prevProps, prevState);
        if(this.state.project_name !== prevState.project_name) {
            monday.storage.instance.setItem('project_name', this.state.project_name);
        }
        if(this.state.workflow_name !== prevState.workflow_name) {
            monday.storage.instance.setItem('workflow_name', this.state.workflow_name);
        }
        if(this.state.project_name !== "" && Object.keys(this.props.projects).length > 0 && this.state.workflows === prevState.workflows) {
            this.get_workflows();
        }
    }

    get_workflows() {
        try {
            var workflow_list = [];
            var check_list = [];
            var workflows = this.props.projects[this.state.project_name];
            var workflow_keys = Object.keys(workflows);
            for(var workflow in workflow_keys) {
                if(!check_list.includes(workflows[workflow].name)) {
                    workflow_list.push(workflows[workflow]);
                    check_list.push(workflows[workflow]['name']);
                }
            }

            this.setState({ workflows: workflow_list });
        } catch(error) {}
    }

    componentDidMount() {
        monday.storage.instance.getItem('project_name').then(res => {
            if(res.data.value !== null) {
                this.setState({ project_name: res.data.value });
            }
        });
        monday.storage.instance.getItem('workflow_name').then(res => {
            if(res.data.value !== null) {
                this.setState({ workflow_name: res.data.value });
            }
        });
    }

    displayConfig(enabled, type="") {
        this.setState({ configEnabled: enabled, configType: type });
        if(type === 'project') {
            this.setState({ project_name: "" });
        } else if(type === 'workflow') {
            this.setState({ workflow_name: "" });
        }
    }

    setProject(project_name) {
        this.setState({ project_name: project_name });
    }

    setWorkflow(workflow_name) {
        this.setState({ workflow_name: workflow_name });
    }

    getStatus(prevProps, prevState) {
        var project = this.props.projects[this.state.project_name];
        if(project === undefined || this.state.project_name === "") {
            if(!this.state.configEnabled && this.state.configType !== "project") {
                this.displayConfig(true, "project");
            }
        } else {
            var workflow = project.find(workflow => workflow.name === this.state.workflow_name);
            if(workflow === undefined) {
                if(!this.state.configEnabled || this.state.configType !== "workflow") {
                    this.displayConfig(true, "workflow");
                    monday.storage.instance.getItem('workflow_name').then(res => {
                        if(res.data.value !== null && res.data.value !== this.state.workflow_name) {
                            this.setState({ workflow_name: res.data.value });
                        }
                    });
                }
            } else {
                if(this.state.configEnabled) {
                    this.displayConfig(false);
                }
                if(workflow !== undefined && this.state.status !== workflow.status) {
                    this.setState({ status: workflow.status });
                    if(this.props.loading) {
                        this.props.stopLoading();
                    };
                }
            }
        }
    }

    render() {
        if(this.props.loading) {
            return <div className="App"><Badge project={this.state.project_name} workflow={this.state.workflow_name} status={this.state.status} theme={this.props.theme} edit_mode={this.props.edit_mode} edit_project={() => this.displayConfig(true, "project")} edit_workflow={() => this.displayConfig(true, "workflow")} loading={this.props.loading} /></div>;
        } else if(this.state.configEnabled && this.state.configType === "project") {
            return <div className="App"><ProjectConfig projects={this.props.projects} setProject={this.setProject} project_name={this.state.project_name} displayConfig={this.displayConfig} /></div>;
        } else if(this.state.configEnabled && this.state.configType === "workflow") {
            return <div className="App"><WorkflowConfig workflows={this.state.workflows} setWorkflow={this.setWorkflow} workflow_name={this.state.workflow_name} displayConfig={this.displayConfig} /></div>;
        } else {
            return <div className="App"><Badge project={this.state.project_name} workflow={this.state.workflow_name} status={this.state.status} theme={this.props.theme} edit_mode={this.props.edit_mode} edit_project={() => this.displayConfig(true, "project")} edit_workflow={() => this.displayConfig(true, "workflow")} loading={this.props.loading} /></div>;
        }
    }
}

class ProjectConfig extends React.Component {
    render() {
        return <div>
            <p className="">Select your project</p>
            <div className="project_wrapper">
            {Object.keys(this.props.projects).map((project) =>
                                                  <div className="project_block" onClick={() => this.props.setProject(project.toString())}>
                                                  <p>{project.toString().split("/").pop()}</p>
                                                  </div>
                                                 )}
        </div>
            </div>;
    }

}

class WorkflowConfig extends React.Component {
    render() {
        return <div>
            <p className="">Select your workflow</p>
            <div className="project_wrapper">
            {this.props.workflows.map((workflow) =>
                                      <div className="project_block" onClick={() => this.props.setWorkflow(workflow.name)}>
                                      <p>{workflow.name}</p>
                                                  </div>
                                                 )}
        </div>
            </div>;
    }
}

class Badge extends React.Component {
    render() {
        if(!this.props.loading) {
        return <div className={this.props.theme === "dark" ? "dark_mode" : ""}>
            <Tilt className="Tilt Tilt_status" options={{ max : 25 }} onMouseLeave={this.onMouseLeave}>
            <p className="status_badge_title">{this.props.project.split("/").pop()} {this.props.edit_mode ? <MaterialIcon icon='edit' color='#000' onClick={this.props.edit_project} /> : ""}</p>
            <p className="status_badge_subtitle">{this.props.workflow} {this.props.edit_mode ? <MaterialIcon icon='edit' color='#000' onClick={this.props.edit_workflow} /> : ""}</p>
            <div className={"Tilt-inner status_badge_wrapper status_" + this.props.status}>
            <div className="status_badge_icon"><StatusIcon status={this.props.status} /></div><p className="status_badge_text">{this.props.status}</p>
            </div>
            </Tilt>
            </div>;
        } else {
            return <div className={this.props.theme === "dark" ? "dark_mode" : ""}>
                <Tilt className="Tilt Tilt_status" options={{ max : 25 }} onMouseLeave={this.onMouseLeave}>
                <p className="status_badge_title"><Skeleton /></p>
                <p className="status_badge_subtitle"><Skeleton /></p>
                <Skeleton width={100} className="Tilt-inner status_badge_wrapper">
                </Skeleton>
                </Tilt>
                </div>;
        }
    }
}

class StatusIcon extends React.Component {
    render() {
        if(this.props.status === 'canceled') {
            return <MaterialIcon icon='remove_circle_outline' color='#FFF' />;
        } else if(this.props.status === 'failed') {
            return <MaterialIcon icon='error_outline' color='#FFF' />;
        } else if(this.props.status === 'success') {
            return <MaterialIcon icon='check_circle_outline' color='#FFF' />;
        } else {
            return null;
        }
    }
}

export default App;
