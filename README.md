## Overview
Welcome to my CircleCI dashboard widget! This widget shows you the status of the specified CircleCI build.

## Run the project

In the project directory, you should run:

### `npm install`

And then to run an application with automatic virtual ngrok tunnel, run:

### `npm start`

Visit http://localhost:4040/status and under "command_line section" find the URL. This is the public URL of your app, so you can use it to test it.
F.e.: https://021eb6330099.ngrok.io


## To test the dashboard widget

To test the dashboard widget, go to a Monday.com dashboard (not workspace) and click the 'Edit' button at the top of the page. Then you can click 'Add widget' and then go to 'Apps'. Search for the CircleCI widget and click '+ Add widget'. Now you can configure the widget. Enter you CircleCI API token, VCS provider and organization name. Now you can select a project and workflow and you are done!

## To test the automation

To test the automation, go to a board and click the integrations button at the top right of the page. Go to integrations center and search for CircleCI. Now you can add an automation by clicking 'Add to board'. This will redirect you to a CircleCI auth page and then to a Monday auth page. After you filled in everything, you can configure the automation.

## Help
Need help? Just send me an email
