import requests

def count_words_at_url(url):
    """ job description """
    print "count_words_at_url started"
    resp = requests.get(url)
    print resp
    return len(resp.text.split())
