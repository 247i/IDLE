import unittest

from poprogress import *


class TestFile(unittest.TestCase):
    def test_simple_progress(self):
        file = [i for i in range(1000000)]
        for i in simple_progress(file):
            pass
