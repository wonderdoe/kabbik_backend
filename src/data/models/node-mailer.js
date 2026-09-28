const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 587,
    secure: false,
    auth: {
        user: process.env.BREVO_SMTP_USER,
        pass: process.env.BREVO_SMTP_KEY
    },
    tls: {
        ciphers: 'SSLv3',
        rejectUnauthorized: false
    }
});

/**
 * Send an email.
 *
 * @param {Object} options
 * @param {string|string[]} options.to        - Recipient(s)
 * @param {string}          options.subject   - Subject line
 * @param {string}          [options.html]    - HTML body
 * @param {string}          [options.text]    - Plain-text fallback
 * @param {string}          [options.from]    - Sender (defaults to no-reply@kabbik.com)
 * @param {Array}           [options.attachments] - Nodemailer attachment objects
 * @returns {Promise<Object>} Nodemailer info object
 */
async function sendEmail({ to, subject, html, text, from, attachments = [] }) {
    const mailOptions = {
        from: from || '"No-Reply" <no-reply@kabbik.com>',
        to: Array.isArray(to) ? to.join(', ') : to,
        subject,
        html,
        text,
        headers: {
            'X-Priority': '1',
            'X-Mailer': 'Node.js Nodemailer'
        },
        attachments
    };

    const info = await transporter.sendMail(mailOptions);
    return info;
}

module.exports = { sendEmail, transporter };