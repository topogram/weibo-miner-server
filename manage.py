import unittest
import os
import coverage
from colour_runner.runner import ColourTextTestRunner

from flask.ext.script import Manager
from flask.ext.migrate import Migrate, MigrateCommand

from src.resources import app 
from src.resources.db import db

migrate = Migrate(app, db)
manager = Manager(app)

manager.add_command('db', MigrateCommand)

@manager.command
def tests():
    """Runs the unit tests without coverage."""
    tests = unittest.TestLoader().discover('tests')
    ColourTextTestRunner(verbosity=2).run(tests)

@manager.command
def cov():
    """Runs the unit tests with coverage."""
    cov = coverage.coverage(
        branch=True,
        include='src/*'
    )
    cov.start()
    tests = unittest.TestLoader().discover('tests')
    unittest.TextTestRunner(verbosity=2).run(tests)
    cov.stop()
    cov.save()
    print 'Coverage Summary:'
    cov.report()
    basedir = os.path.abspath(os.path.dirname(__file__))
    covdir = os.path.join(basedir, 'coverage')
    cov.html_report(directory=covdir)
    cov.erase()

if __name__ == "__main__":
    manager.run()
