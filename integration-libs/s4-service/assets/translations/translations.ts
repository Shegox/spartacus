/*
 * SPDX-FileCopyrightText: 2024 SAP Spartacus team <spartacus-team@sap.com>
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { TranslationChunksConfig, TranslationResources } from '@spartacus/core';
import { en } from './en/index';

export const s4ServiceTranslations: TranslationResources = {
  en,
};

export const s4ServiceTranslationChunksConfig: TranslationChunksConfig = {
  s4Service: ['serviceOrderCheckout'],
};
