const { transporter, send } = require("../services/nodemailer")
const pool = require('../conexão/conexao')
const senha_unica = require('../conexão/senha_unica')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')

const novoRegistro = async (req, res) => {
    try{
        const { nome, email, idade, senha } = req.body
        for (let validador of Object.keys({ nome, email, idade, senha })) {
            if (!req.body[validador]) {
                return res.status(400).json({ "mensagem": `É necessário preencher o campo ${validador} para prosseguir` })
            }
        }
        const senhaCriptografada = await bcrypt.hash(senha, 10)
        const cadastrarUsuario = await pool.query('insert into cadastro (nome, email, idade, senha) values ($1, $2, $3, $4) returning *',
        [ nome, email, idade, senhaCriptografada ])
        const { senha: _, ...usuarioCadastrado } = cadastrarUsuario.rows[0]
        const subject = `${nome} acabou de fazer login na sua conta? Em caso positivo, desconsidere este email, senão atualize sua senha.`
        send(to=email, subject)
        res.status(200).json(usuarioCadastrado)
    } catch(error){
        console.log(error.message)
        res.status(500).json({ "mensagem": "Erro interno do servidor"})
    }
}

const login = async (req, res) => {
    const { email, senha } = req.body
    for (let validador of Object.keys({ email, senha })){
        if(!req.body[validador]){
            return res.status(400).json({ mensage: `É obrigatório preecher o campo ${validador}` })
        }
    }

    try{
        const usuario = await pool.query( 'select * from cadastro where email = $1', [ email ] )
        if( usuario.rowCount < 1 ){
            return res.status(400).json({ mensagem: 'Usuário e/ou senha inválidos(s).' })
        }

        const senhaValida = await bcrypt.compare( senha, usuario.rows[0].senha )
        if(!senhaValida || usuario.rowCount < 1){
            return res.status(400).json({ mensagem: "Usuário e/ou senha inválidos(s)." })
        }

        const token = jwt.sign({ id: usuario.rows[0].id }, senha_unica, { expiresIn: '8h' })
        const { senha: _, ...usuarioCadastrado } = usuario.rows[0]
        transporter.sendMail({
            from: `${process.env.MAIL_FROM}`,
            to: `${usuario.rows[0].nome} <${email}>`,
            subject: 'Verificação de Integração',
            html: `<h1>${usuario.rows[0].nome} você realizou login?</h1>
            <p>Caso você tenha realizado login, desconsidere este email, caso contrário, atualize sua senha.</p>
            `
        })
        return res.json({ usuario: usuarioCadastrado, token } )

    } catch( error ){
        console.log( error.message )
        return res.status(500).json( "Erro interno do servidor" )
    }
}

const validarLogin = async (req, res, next) => {
    try {
        const { authorization } = req.headers
        if (!authorization){
            return res.status(401).json({ mensagem: "Para acessar este recurso um token de autenticação válido deve ser enviado." })
        }

        const token = authorization.split(' ')[1]
        const { id } = jwt.verify( token, senha_unica ) 
        const { rows, rowCount } = await pool.query('select * from cadastro where id = $1', [id])
        if(rowCount < 1){
            return res.status(401).json({ mensagem: "Não autorizado" })
        }

        req.usuario = { rows, rowCount }      
        next()

    } catch(error){
        console.log(error.message)
        return res.status(401).json({ mensagem: "Não autorizado!" })       
    }
}

const enviarEmail = async (req, res) => {
    const { to, subject, body } = req.body  
    const html = `<h1>Essa é a newsletter registrada por ${req.usuario.rows[0].nome}</h1>
    <p>Essa é a lista de notícias da semana</p>
    `
    send(to, subject, html)  
    return res.json('Email enviado com sucesso!')
}

module.exports = {
    novoRegistro,
    login,
    validarLogin,
    enviarEmail
}