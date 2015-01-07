import sendgrid

mailer = sendgrid.SendGridClient(app.config['SENDGRID_USERNAME'],
                           app.config['SENDGRID_PASSWORD'],
                           secure=True)


def send_welcome_email(to, name):
    subject = "Welcome to Topogram.io"
    txt_template = jinja_env.get_template('emails/confirm.txt')
    html_template = jinja_env.get_template('emails/confirm.html')
    text = txt_template.render(name=name)
    html = html_template.render(name=name)
    message = sendgrid.Message(('hi@topogram.io', 'Topogram Invites'),
                               subject, text, html)

    message.add_to(to)
    mailer.web.send(message)
