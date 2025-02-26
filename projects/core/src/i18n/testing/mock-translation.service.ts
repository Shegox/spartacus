/*
 * SPDX-FileCopyrightText: 2024 SAP Spartacus team <spartacus-team@sap.com>
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { TranslationService } from '../translation.service';
import { mockTranslate } from './mock-translate';

@Injectable()
export class MockTranslationService implements TranslationService {
  translate(
    key: string | string[],
    options: any = {},
    _whitespaceUntilLoaded: boolean = false
  ): Observable<string> {
    return new Observable<string>((subscriber) => {
      const value = mockTranslate(key, options);
      subscriber.next(value);
      subscriber.complete();
    });
  }

  loadChunks(_chunks: string | string[]): Promise<any> {
    return Promise.resolve();
  }
}
