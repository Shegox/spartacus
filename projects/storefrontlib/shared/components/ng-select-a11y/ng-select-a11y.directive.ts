/*
 * SPDX-FileCopyrightText: 2024 SAP Spartacus team <spartacus-team@sap.com>
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  AfterViewInit,
  Directive,
  ElementRef,
  inject,
  Input,
  Renderer2,
} from '@angular/core';
import { FeatureConfigService } from '@spartacus/core';

@Directive({
  selector: '[cxNgSelectA11y]',
})
export class NgSelectA11yDirective implements AfterViewInit {
  /**
   * Use directive to bind aria attribute to inner element of ng-select
   * Angular component for accessibility compliance. If ng-select controls itself
   * ariaControls is not needed, instead bind a specific id to the <ng-select> element.
   */
  @Input() cxNgSelectA11y: { ariaLabel?: string; ariaControls?: string };

  private featureConfigService = inject(FeatureConfigService);

  constructor(
    private renderer: Renderer2,
    private elementRef: ElementRef
  ) {}

  ngAfterViewInit(): void {
    const divCombobox =
      this.elementRef.nativeElement.querySelector('[role="combobox"]');
    const inputElement = divCombobox.querySelector('input');

    const ariaLabel = this.cxNgSelectA11y.ariaLabel;
    const elementId = this.elementRef.nativeElement.id;
    const ariaControls = this.cxNgSelectA11y.ariaControls ?? elementId;

    if (ariaLabel) {
      this.renderer.setAttribute(divCombobox, 'aria-label', ariaLabel);
    }

    if (ariaControls) {
      this.renderer.setAttribute(divCombobox, 'aria-controls', ariaControls);
    }

    if (
      this.featureConfigService.isEnabled('a11yNgSelectMobileReadout') &&
      inputElement.readOnly
    ) {
      this.renderer.setAttribute(inputElement, 'aria-hidden', 'true');
    }
  }
}
