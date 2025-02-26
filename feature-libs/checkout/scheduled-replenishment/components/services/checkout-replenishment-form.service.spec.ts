import { TestBed, waitForAsync } from '@angular/core/testing';
import { ORDER_TYPE, ScheduleReplenishmentForm } from '@spartacus/order/root';
import { take } from 'rxjs/operators';
import { CheckoutReplenishmentFormService } from './checkout-replenishment-form.service';

const newReplenishmentFormData: ScheduleReplenishmentForm = {
  recurrencePeriod: 'test-period',
  numberOfWeeks: 'test-num-weeks',
};

describe('Checkout Replenishment Form Service', () => {
  let service: CheckoutReplenishmentFormService;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      providers: [CheckoutReplenishmentFormService],
    });
  }));

  beforeEach(() => {
    service = TestBed.inject(CheckoutReplenishmentFormService);
  });

  it('should get default schedule replenishment form data', () => {
    const defaultFormData: ScheduleReplenishmentForm = service.defaultFormData;
    defaultFormData.nthDayOfMonth = '2';
    let expectedFormData: ScheduleReplenishmentForm | undefined;

    service
      .getScheduleReplenishmentFormData()
      .subscribe((data) => (expectedFormData = data))
      .unsubscribe();

    expect(expectedFormData).toEqual(defaultFormData);
    expect(expectedFormData?.replenishmentStartDate).toMatch(
      /^[0-9]{4}-[0-1][0-9]-[0-3][0-9]$/
    );
    expect(expectedFormData?.replenishmentStartDate).not.toMatch(
      /^[0-9]{4}-[0-1][0-9]-[0-3][0-9]T$/
    );
  });

  it('should set new replenishment form data', () => {
    service.setScheduleReplenishmentFormData(newReplenishmentFormData);

    let result: ScheduleReplenishmentForm | undefined;

    service
      .getScheduleReplenishmentFormData()
      .subscribe((data) => (result = data))
      .unsubscribe();

    expect(result).toEqual(newReplenishmentFormData);
  });

  it('should reset the form data to default', () => {
    service.setScheduleReplenishmentFormData(newReplenishmentFormData);

    let result: ScheduleReplenishmentForm | undefined;

    service
      .getScheduleReplenishmentFormData()
      .subscribe((data) => (result = data));

    expect(result).toEqual(newReplenishmentFormData);

    service.resetScheduleReplenishmentFormData();

    expect(result).toEqual(service.defaultFormData);
  });

  it(`should set an order type return an order type`, (done) => {
    service.setOrderType(ORDER_TYPE.SCHEDULE_REPLENISHMENT_ORDER);

    service
      .getOrderType()
      .pipe(take(1))
      .subscribe((result) => {
        expect(result).toEqual(ORDER_TYPE.SCHEDULE_REPLENISHMENT_ORDER);
        done();
      });
  });
});
