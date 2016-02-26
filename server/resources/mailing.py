from server import app
import requests
# print app.config

def send_email(to_address, subject, plaintext, html):
    # print to_address, subject, plaintext, html
    r = requests.\
        post("https://api.mailgun.net/v3/%s/messages" % app.config['MAILGUN_DOMAIN'],
            auth=("api", app.config['MAILGUN_KEY']),
             data={
                 "from": "hi@topogram.io",
                 "to": to_address,
                 "subject": subject,
                 "text": plaintext,
                 "html": html
             }
         )
    print r.status_code, r.text
    return r


def send_reset_password_email(to_address, reset_url):
    subject = "Topogram: Reset your password"
    plaintext = "Hello, you can reset your password by visiting this url : %s . Have a nice day ! "%reset_url
    html = "Hello, you can reset your password by visiting this url : <a href='%s'>%s</a>  . Have a nice day !"%(reset_url, reset_url)

    send_email(to_address, subject, plaintext, html)

def send_welcome_email(to_address):
    subject = "Welcome to Topogram !"
    plaintext = "Hello Dear, \n You can now go to http://weibo.topogram.io and start to use it. \n Hope you will enjoy it!"
    html = "Hello Dear, \n You can now go to <a href='http://weibo.topogram.io'>http://weibo.topogram.io</a> and start to use it. \n Hope you will enjoy it!"
    send_email(to_address, subject, plaintext, html)
