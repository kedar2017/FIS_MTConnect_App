A list of functionalities of the current program

1. Continuous data streaming from the machine

2. Parses chunks of data that is streamed into separate DOM objects

3. Uses a readable stream to handle DOM objects

4. Converts DOM objects to relevant JSON messages

5. Sends JSON messages to the MQTT broker

Change log

Version 1.0 completed!

07dffd8 - Added configuration file and modified the key names. Alongside, added a few variables for timers used in error handling in the main program

3263d96 - Adding streaming data code with parsing and network error handling plus configuration file for independant machine access 

71b1ca8 - README.md edited online with Bitbucket to include all the functionalities of the program

2e5a705 - modified Readme to include some features of the app

c4b9b37 - Modified to get a simple working ocde with streaming data functionality

6cb82e9 - Added a simple script for testing streamed data using 'interval=0' URL 

ae33fff - Added file readign functionality to limit DataItemIds 

7879f27 - Added basic xml navigator with targeted path in the URL

5a9ace4 - Adding a basic MTConnect to MQTT app