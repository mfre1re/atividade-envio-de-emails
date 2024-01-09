const express = require('express')
const { enviarEmail, novoRegistro, login, validarLogin } = require('./controladores/mail')

const rotas = express()

rotas.post('/cadastrar', novoRegistro)
rotas.post('/login', login)
rotas.use(validarLogin)
rotas.post('/send', enviarEmail)

module.exports = rotas