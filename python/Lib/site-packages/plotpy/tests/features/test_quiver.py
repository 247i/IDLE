# -*- coding: utf-8 -*-
#
# Licensed under the terms of the BSD 3-Clause
# (see plotpy/LICENSE for details)

"""Quiver plot item test"""

# guitest: show

import numpy as np
from guidata.qthelpers import qt_app_context

from plotpy.builder import make
from plotpy.tests import vistools as ptv


def test_quiver():
    """Testing quiver plot item"""
    with qt_app_context(exec_loop=True):
        # Example 1: Rotational vector field
        x = np.linspace(-2, 2, 15)
        y = np.linspace(-2, 2, 15)
        X, Y = np.meshgrid(x, y)
        U = -Y
        V = X
        item1 = make.quiver(X, Y, U, V, title="Rotation", color="blue")

        _win1 = ptv.show_items(
            [item1],
            plot_type="curve",
            wintitle="Quiver: Rotational field",
        )

        # Example 2: Gradient field (converging to origin)
        U2 = -X
        V2 = -Y
        item2 = make.quiver(X, Y, U2, V2, title="Convergence", color="red")

        _win2 = ptv.show_items(
            [item2],
            plot_type="curve",
            wintitle="Quiver: Gradient field",
        )

        # Example 3: 1D input (auto meshgrid)
        item3 = make.quiver(
            x,
            y,
            U,
            V,
            title="From 1D arrays",
            color="darkgreen",
            arrow_scale=40.0,
            arrow_head_size=8.0,
        )
        _win3 = ptv.show_items(
            [item3],
            plot_type="curve",
            wintitle="Quiver: 1D input arrays",
        )

        # Example 4: Uniform field
        U4 = np.ones_like(X)
        V4 = np.zeros_like(Y)
        item4 = make.quiver(X, Y, U4, V4, title="Uniform", color="#FF8800")

        _win4 = ptv.show_items(
            [item4],
            plot_type="curve",
            wintitle="Quiver: Uniform field",
        )


if __name__ == "__main__":
    test_quiver()
