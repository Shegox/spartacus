/*
 * SPDX-FileCopyrightText: 2024 SAP Spartacus team <spartacus-team@sap.com>
 *
 * SPDX-License-Identifier: Apache-2.0
 */

// Email Standard RFC 5322:
export const EMAIL_PATTERN =
  /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/; // eslint-disable-line

export const PASSWORD_PATTERN =
  /^(?=.*?[A-Z])(?=.*?\d)(?=.*?[!@#$%^*()_\-+{};:.,]).{6,}$/;

export const MIN_ONE_UPPER_CASE_CHARACTER_PATTERN = /^(?=.*?[A-Z]).*$/;

export const MIN_ONE_DIGIT_PATTERN = /^(?=.*?\d).*$/;

export const MIN_ONE_SPECIAL_CHARACTER_PATTERN =
  /^(?=.*?[!@#$%^*()_\-+{};:.,]).*$/;

export const MIN_SIX_CHARACTERS_PATTERN = /^.{6,}$/;
