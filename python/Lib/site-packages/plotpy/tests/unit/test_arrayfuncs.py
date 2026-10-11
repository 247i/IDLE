# -*- coding: utf-8 -*-
#
# Licensed under the terms of the BSD 3-Clause
# (see plotpy/LICENSE for details)

"""Unit tests for ``plotpy.mathutils.arrayfuncs``."""

from __future__ import annotations

import numpy as np

from plotpy.mathutils import arrayfuncs


def test_get_nan_min_max_empty_float() -> None:
    """Empty float arrays must not raise and should return NaN."""
    empty = np.array([], dtype=np.float64)
    assert np.isnan(arrayfuncs.get_nan_min(empty))
    assert np.isnan(arrayfuncs.get_nan_max(empty))
    rng = arrayfuncs.get_nan_range(empty)
    assert np.isnan(rng[0]) and np.isnan(rng[1])


def test_get_nan_min_max_empty_integer() -> None:
    """Empty integer arrays must not raise and should return NaN."""
    empty = np.array([], dtype=np.int32)
    assert np.isnan(arrayfuncs.get_nan_min(empty))
    assert np.isnan(arrayfuncs.get_nan_max(empty))


def test_get_nan_min_max_all_nan() -> None:
    """All-NaN float arrays must not raise and should return NaN."""
    data = np.array([np.nan, np.nan, np.nan], dtype=np.float64)
    assert np.isnan(arrayfuncs.get_nan_min(data))
    assert np.isnan(arrayfuncs.get_nan_max(data))


def test_get_nan_min_max_regular() -> None:
    """Regression test: regular arrays still work."""
    data = np.array([3.0, 1.0, np.nan, 4.0, 2.0])
    assert arrayfuncs.get_nan_min(data) == 1.0
    assert arrayfuncs.get_nan_max(data) == 4.0


if __name__ == "__main__":
    test_get_nan_min_max_empty_float()
    test_get_nan_min_max_empty_integer()
    test_get_nan_min_max_all_nan()
    test_get_nan_min_max_regular()
