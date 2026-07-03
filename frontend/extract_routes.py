import re

with open('server.js', 'r') as f:
    content = f.read()

# We need to extract all app.get and app.post definitions.
# Wait, let's just grab everything from line 225 to 882.
lines = content.split('\n')
routes_content = "const express = require('express');\nconst router = express.Router();\n"
routes_content += "const { state, mockProjects, getActiveProject } = require('../data/store');\n"
routes_content += "const { renderChatMessage, renderSandbox } = require('../utils/renderers');\n\n"

# Replace app. with router.
routes_body = '\n'.join(lines[225:882]).replace('app.get(', 'router.get(').replace('app.post(', 'router.post(')

# Also need to replace global variables like selectedPersonaId and simulationDone
# because they are now in store.state
routes_body = routes_body.replace('selectedPersonaId', 'state.selectedPersonaId')
routes_body = routes_body.replace('simulationDone', 'state.simulationDone')
routes_body = routes_body.replace('activeProjectId =', 'state.activeProjectId =')

routes_content += routes_body + "\n\nmodule.exports = router;\n"

with open('src/routes/index.js', 'w') as f:
    f.write(routes_content)

# Now rewrite server.js
server_top = '\n'.join(lines[:36]) + '\n\n'
server_top += "const { state, mockProjects, getActiveProject } = require('./src/data/store');\n"
server_top += "const routes = require('./src/routes/index');\n\n"
server_top += "app.use('/', routes);\n\n"
server_top += '\n'.join(lines[883:])

# Also there was app.post('/api/chat/persona/:personaId') around line 88!
# Let's extract that manually.
persona_chat_route = '\n'.join(lines[87:115]).replace('app.post(', 'router.post(') + '\n\n'

routes_content = routes_content.replace('const router = express.Router();\n', 'const router = express.Router();\n\n' + persona_chat_route)
with open('src/routes/index.js', 'w') as f:
    f.write(routes_content)

with open('server.js', 'w') as f:
    f.write(server_top)

