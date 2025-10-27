services:
  - type: web
    name: whatsapp-pair-bot
    env: node
    plan: free
    buildCommand: npm install
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production