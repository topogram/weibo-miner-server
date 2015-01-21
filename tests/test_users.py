#!/usr/bin/env python
# -*- coding: utf-8 -*-

import json
import unittest

from base import BaseTestCase
from flask.ext.login import current_user

from server import bcrypt
from server.models.user import User

class TestUser(BaseTestCase):

    # Ensure user can register
    def test_user_registeration(self):
        """ Ensure user can register """
        data = {"password" : "password", "invite" : "invite", "email" : "test@test.com"}
        with self.client:
            resp = self.client.post("/api/v1/users", data=data)
            self.assertEqual(resp.status_code,  201)
            self.assertEqual(current_user.email, data["email"])
            self.assertTrue(current_user.is_active())
            user = User.query.filter_by(email=data["email"]).first()
            self.assertTrue(user.email == data["email"])

    def test_incorrect_user_registeration(self):
        """ Ensure errors are thrown during an incorrect user registration """
        data = {"password" : "", "invite" : "invite", "email" : "test"}
        with self.client:
            resp = self.client.post("/api/v1/users", data=data)
            self.assertIn(b'Invalid email address.', resp.data)
            self.assertIn(b'This field is required.', resp.data)
            self.assertEqual(resp.status_code, 422)

    def test_require_invite(self):
        """ Ensure an invite code is required for registering """
        data = {"password" : "djqsld", "email" : "test@test.com"}
        resp = self.client.post("/api/v1/users", data=data, follow_redirects=True)

        self.assertIn(b'This field is required.', resp.data)
        self.assertEqual(resp.status_code,  422)
        data = {"password" : "djqsld", "invite" : "wrong", "email" : "test@test.com"}
        resp = self.client.post("/api/v1/users", data=data, follow_redirects=True)
        self.assertIn(b'Wrong invitation code.', resp.data)

    # Ensure id is correct for the current/logged in user
    def test_login(self):
        """ Ensure id is correct for the current/logged in user """
        data = {"password" : "admin", "email" : "ad@min.com"}
        with self.client:
            resp = self.client.post("/api/v1/sessions", data=data)
            self.assertTrue(current_user.id == 1)
            self.assertFalse(current_user.id == 20)

     # Ensure given password is correct after unhashing
    def test_check_password(self):
        """ Ensure given password is correct after unhashing """
        data = {"password" : "admin", "email" : "ad@min.com"}
        with self.client:
            user = User.query.filter_by(email='ad@min.com').first()
            self.assertTrue(bcrypt.check_password_hash(user.password, "admin"))
            self.assertFalse(bcrypt.check_password_hash(user.password, 'foobar'))

class UserViewsTests(BaseTestCase):

    # Ensure login behaves correctly with correct credentials
    def test_correct_login(self):
        """ Ensure login behaves correctly with correct credentials """
        data = {"password" : "admin", "email" : "ad@min.com"}
        with self.client:
            resp = self.client.post(
                '/api/v1/sessions',
                data=data)
            self.assertEquals(201, resp.status_code)
            self.assertIn(b'You were logged in', resp.data)
            self.assertTrue(current_user.email == "ad@min.com")
            self.assertTrue(current_user.is_active())

    # Ensure login behaves correctly with incorrect credentials
    def test_incorrect_login(self):
        """ Ensure login behaves correctly with incorrect credentials """
        data = {"password" : "wrong", "email" : "other@min.com"}
        resp = self.client.post(
            '/api/v1/sessions',
            data=data,
            follow_redirects=True
        )
        self.assertIn(b'"User does not exist.', resp.data)
        data = {"password" : "wrong", "email" : "ad@min.com"}
        resp = self.client.post(
            '/api/v1/sessions',
            data=dict(email="ad@min.com", password="wrong"),
            follow_redirects=True
        )
        self.assertIn(b'"Invalid password.', resp.data)

    # Ensure logout behaves correctly
    def test_logout(self):
        """ Ensure logout behaves correctly """
        data = {"password" : "admin", "email" : "ad@min.com"}
        with self.client:
            self.client.post('/api/v1/sessions',data=data)
            resp = self.client.delete('/api/v1/sessions')
            self.assertIn(b'You were logged out', resp.data)
            self.assertFalse(current_user.is_active())

if __name__ == '__main__':
    unittest.main()
