# -*- coding: utf-8 -*-
#
# Licensed under the terms of the BSD 3-Clause
# (see plotpy/LICENSE for details)

"""Styles unit tests"""

import gettext
import unittest

from qtpy import QtCore as QC
from qtpy import QtGui as QG
from qwt import QwtSymbol

from plotpy.config import UserConfig, _
from plotpy.items import Marker
from plotpy.styles.base import LineStyleParam, SymbolParam
from plotpy.styles.shape import MarkerParam

gettext.install("test")
CONF = UserConfig({})
CONF.set_application("plotpy", version="0.0.0", load=False)


class TestSymbol(unittest.TestCase):
    def test_default(self):
        sym = SymbolParam(_("Symbol"))
        _obj = sym.build_symbol()

    def test_update(self):
        obj = QwtSymbol(
            QwtSymbol.Rect,
            QG.QBrush(QC.Qt.black),
            QG.QPen(QC.Qt.yellow),
            QC.QSize(3, 3),
        )
        sym = SymbolParam(_("Symbol"))
        sym.update_param(obj)
        self.assertEqual(sym.marker, "Rect")
        self.assertEqual(sym.size, 3)
        self.assertEqual(sym.edgecolor, "#ffff00")
        self.assertEqual(sym.facecolor, "#000000")

    def test_saveconfig(self):
        sym = SymbolParam(_("Symbol"))
        sym.write_config(CONF, "sym", "")
        sym = SymbolParam(_("Symbol"))
        sym.read_config(CONF, "sym", "")

    def test_changeconfig(self):
        obj = QwtSymbol(
            QwtSymbol.Rect,
            QG.QBrush(QC.Qt.black),
            QG.QPen(QC.Qt.yellow),
            QC.QSize(3, 3),
        )
        sym = SymbolParam(_("Symbol"))
        sym.update_param(obj)
        sym.write_config(CONF, "sym", "")
        sym = SymbolParam(_("Symbol"))
        sym.read_config(CONF, "sym", "")
        self.assertEqual(sym.marker, "Rect")
        self.assertEqual(sym.size, 3)
        self.assertEqual(sym.edgecolor, "#ffff00")
        self.assertEqual(sym.facecolor, "#000000")
        sym.build_symbol()


class TestLineStyle(unittest.TestCase):
    def test_default(self):
        ls = LineStyleParam(_("Line style"))
        _obj = ls.build_pen()

    def test_update(self):
        obj = QG.QPen(QC.Qt.red, 2, QC.Qt.SolidLine)
        ls = LineStyleParam(_("Line style"))
        ls.update_param(obj)
        self.assertEqual(ls.width, 2)
        self.assertEqual(ls.style, "SolidLine")
        self.assertEqual(ls.color, "#ff0000")


class TestMarkerParam(unittest.TestCase):
    def test_update_param_preserves_unselected_style_when_selected(self):
        param = MarkerParam(_("Marker"))
        param.line.color = "#ff0000"
        param.symbol.facecolor = "#ffff00"
        param.text.textcolor = "#0000ff"
        param.sel_line.color = "#00ff00"
        param.sel_symbol.facecolor = "#00ffff"
        param.sel_text.textcolor = "#ff00ff"
        marker = Marker(markerparam=param)

        marker.select()
        marker.update_item_parameters()

        self.assertEqual(marker.markerparam.line.color, "#ff0000")
        self.assertEqual(marker.markerparam.symbol.facecolor, "#ffff00")
        self.assertEqual(marker.markerparam.text.textcolor, "#0000ff")
        self.assertEqual(marker.markerparam.sel_line.color, "#00ff00")
        self.assertEqual(marker.markerparam.sel_symbol.facecolor, "#00ffff")
        self.assertEqual(marker.markerparam.sel_text.textcolor, "#ff00ff")

    def test_saveconfig(self):
        ls = LineStyleParam(_("Line style"))
        ls.write_config(CONF, "ls", "")
        ls = LineStyleParam(_("Line style"))
        ls.read_config(CONF, "ls", "")

    def test_changeconfig(self):
        obj = QG.QPen(QC.Qt.red, 2, QC.Qt.SolidLine)
        ls = LineStyleParam(_("Line style"))
        ls.update_param(obj)
        ls.write_config(CONF, "ls", "")
        ls = LineStyleParam(_("Line style"))
        ls.read_config(CONF, "ls", "")
        self.assertEqual(ls.width, 2)
        self.assertEqual(ls.style, "SolidLine")
        self.assertEqual(ls.color, "#ff0000")


if __name__ == "__main__":
    unittest.main()
