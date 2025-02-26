import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import {
  ConverterService,
  OCC_HTTP_TOKEN,
  PRODUCT_SEARCH_PAGE_NORMALIZER,
  PRODUCT_SUGGESTION_NORMALIZER,
} from '@spartacus/core';
import { ProductSearchPage } from '../../../model/product-search.model';
import { SearchConfig } from '../../../product/model/search-config';
import { Occ } from '../../occ-models/occ.models';
import { OccEndpointsService } from '../../services/occ-endpoints.service';
import { OccProductSearchAdapter } from './occ-product-search.adapter';
import createSpy = jasmine.createSpy;
import { Router } from '@angular/router';

class MockOccEndpointsService {
  buildUrl = createSpy('MockOccEndpointsService.buildUrl').and.callFake(
    // eslint-disable-next-line @typescript-eslint/no-shadow
    (url) => url
  );
}

const queryText = 'test';
const searchResults: ProductSearchPage = { products: [{ code: '123' }] };
const searchResultsWithRedirectKeywords: ProductSearchPage = {
  products: [{ code: '123' }],
  keywordRedirectUrl: 'test',
};
const suggestionList: Occ.SuggestionList = { suggestions: [{ value: 'test' }] };
const mockSearchConfig: SearchConfig = {
  pageSize: 5,
};

describe('OccProductSearchAdapter', () => {
  let service: OccProductSearchAdapter;
  let httpMock: HttpTestingController;
  let endpoints: OccEndpointsService;
  let converter: ConverterService;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        OccProductSearchAdapter,
        {
          provide: OccEndpointsService,
          useClass: MockOccEndpointsService,
        },
      ],
    });
    service = TestBed.inject(OccProductSearchAdapter);
    httpMock = TestBed.inject(HttpTestingController);
    converter = TestBed.inject(ConverterService);
    endpoints = TestBed.inject(OccEndpointsService);
    router = TestBed.inject(Router);

    spyOn(converter, 'pipeable').and.callThrough();
    spyOn(converter, 'pipeableMany').and.callThrough();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('query text search', () => {
    it('should return search results for given query text', () => {
      service.search(queryText, mockSearchConfig).subscribe((result) => {
        expect(result).toEqual(searchResults);
      });

      const mockReq = httpMock.expectOne(
        (req) => req.method === 'GET' && req.url === 'productSearch'
      );

      expect(mockReq.cancelled).toBeFalsy();
      expect(mockReq.request.responseType).toEqual('json');
      expect(mockReq.request.context.get(OCC_HTTP_TOKEN)).toEqual({
        sendUserIdAsHeader: true,
      });
      expect(endpoints.buildUrl).toHaveBeenCalledWith('productSearch', {
        queryParams: {
          query: queryText,
          pageSize: mockSearchConfig.pageSize,
        },
      });
      mockReq.flush(searchResults);
    });

    it('should call converter', () => {
      service.search(queryText, mockSearchConfig).subscribe();
      httpMock.expectOne('productSearch').flush(searchResults);

      expect(converter.pipeable).toHaveBeenCalledWith(
        PRODUCT_SEARCH_PAGE_NORMALIZER
      );
    });

    it('should navigate to keywordRedirectUrl when it exists in the ProductSearchPage', () => {
      service.search(queryText, mockSearchConfig).subscribe();
      spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
      httpMock
        .expectOne('productSearch')
        .flush(searchResultsWithRedirectKeywords);

      expect(router.navigate).toHaveBeenCalledWith([
        searchResultsWithRedirectKeywords.keywordRedirectUrl,
      ]);
    });
  });

  describe('query product suggestions', () => {
    it('should return suggestions for given term', () => {
      service
        .loadSuggestions(queryText, mockSearchConfig.pageSize)
        .subscribe((suggestions) => {
          expect(suggestions).toEqual(suggestionList.suggestions);
        });

      const mockReq = httpMock.expectOne(
        (req) => req.method === 'GET' && req.url === 'productSuggestions'
      );

      expect(mockReq.cancelled).toBeFalsy();
      expect(mockReq.request.responseType).toEqual('json');
      expect(endpoints.buildUrl).toHaveBeenCalledWith('productSuggestions', {
        queryParams: {
          term: queryText,
          max: mockSearchConfig.pageSize.toString(),
        },
      });
      mockReq.flush(suggestionList);
    });

    it('should call converter', () => {
      service.loadSuggestions(queryText, mockSearchConfig.pageSize).subscribe();
      httpMock.expectOne('productSuggestions').flush(suggestionList);

      expect(converter.pipeableMany).toHaveBeenCalledWith(
        PRODUCT_SUGGESTION_NORMALIZER
      );
    });
  });
});
