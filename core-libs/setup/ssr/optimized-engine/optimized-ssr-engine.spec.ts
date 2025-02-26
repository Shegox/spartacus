/// <reference types="jest" />

import { fakeAsync, flush, tick } from '@angular/core/testing';
import { Application, Request, Response } from 'express';
import { IncomingHttpHeaders } from 'http';
import { Socket } from 'net';
import { NgExpressEngineInstance } from '../engine-decorator/ng-express-engine-decorator';
import { ExpressServerLogger, ExpressServerLoggerContext } from '../logger';
import { OptimizedSsrEngine, SsrCallbackFn } from './optimized-ssr-engine';
import {
  RenderingStrategy,
  SsrOptimizationOptions,
  defaultSsrOptimizationOptions,
} from './ssr-optimization-options';

const defaultRenderTime = 100;
const host = 'my.shop.com';

jest.mock('fs', () => ({
  readFileSync: () => '',
}));
const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

class MockExpressServerLogger implements Partial<ExpressServerLogger> {
  log(message: string, context: ExpressServerLoggerContext): void {
    console.log(message, context);
  }
}

/**
 * Helper class to easily create and test engine wrapper against mocked engine.
 *
 * Mocked engine will return sample rendering after 100 milliseconds.
 *
 * Usage:
 * 1. Instantiate the class with desired options
 * 2. Call request() to run request through engine
 * 3. Examine renders property for the renders
 */
class TestEngineRunner {
  /** Accumulates html output for engine runs */
  renders: string[] = [];

  /** Accumulates response parameters for engine runs */
  responseParams: object[] = [];

  renderCount = 0;
  optimizedSsrEngine: OptimizedSsrEngine;
  engineInstance: NgExpressEngineInstance;

  constructor(options: SsrOptimizationOptions, renderTime?: number) {
    // mocked engine instance that will render test output in 100 milliseconds
    const engineInstanceMock = (
      filePath: string,
      _: any,
      callback: SsrCallbackFn
    ) => {
      setTimeout(() => {
        callback(undefined, `${filePath}-${this.renderCount++}`);
      }, renderTime ?? defaultRenderTime);
    };

    this.optimizedSsrEngine = new OptimizedSsrEngine(
      engineInstanceMock,
      options
    );
    this.engineInstance = this.optimizedSsrEngine.engineInstance;
  }

  /** Run request against the engine. The result will be stored in rendering property. */
  request(
    url: string,
    params?: {
      /** headers */
      httpHeaders?: IncomingHttpHeaders;
    }
  ): TestEngineRunner {
    const response: { [key: string]: string } = {};
    const headers = params?.httpHeaders ?? { host };
    /** used when resolving getRequestUrl() and getRequestOrigin() */
    const app = <Partial<Application>>{
      get:
        (_name: string): any =>
        (_connectionRemoteAddress: string) =>
          true,
    };

    const optionsMock = {
      req: <Partial<Request>>{
        protocol: 'https',
        originalUrl: url,
        headers,
        get: (header: string): string | string[] | null | undefined => {
          return headers[header];
        },
        app,
        connection: <Partial<Socket>>{},
        res: <Partial<Response>>{
          set: (key: string, value: any) => (response[key] = value),
          locals: {},
        },
      },
    };

    this.engineInstance(url, optionsMock, (_, html): void => {
      this.renders.push(html ?? '');
      this.responseParams.push(response);
    });

    return this;
  }
}

const getCurrentConcurrency = (
  engineRunner: TestEngineRunner
): { currentConcurrency: number } => {
  return {
    currentConcurrency: engineRunner.optimizedSsrEngine['currentConcurrency'],
  };
};

describe('OptimizedSsrEngine', () => {
  describe('SsrOptimizationOptions', () => {
    it('should use the defaults if an empty object is provided', () => {
      const engineRunner = new TestEngineRunner({});
      expect(engineRunner.optimizedSsrEngine['ssrOptions']).toEqual(
        defaultSsrOptimizationOptions
      );
    });
    it('should override the defaults', () => {
      const engineRunner = new TestEngineRunner({
        reuseCurrentRendering: false,
      });
      expect(engineRunner.optimizedSsrEngine['ssrOptions']).toEqual({
        ...defaultSsrOptimizationOptions,
        reuseCurrentRendering: false,
      });
    });
  });

  describe('logOptions', () => {
    let dateSpy: jest.SpyInstance;

    beforeEach(() => {
      const mockDate = new Date('2023-01-01');
      dateSpy = jest
        .spyOn(global, 'Date')
        .mockImplementationOnce(() => mockDate);
    });

    afterEach(() => {
      dateSpy.mockReset();
    });

    afterAll(() => {
      dateSpy.mockRestore();
    });

    it('should log the provided options', () => {
      new TestEngineRunner({
        timeout: 50,
        renderingStrategyResolver: () => RenderingStrategy.ALWAYS_SSR,
      });

      expect(consoleLogSpy.mock.lastCall).toMatchInlineSnapshot(`
        [
          "{
          "message": "[spartacus] SSR optimization engine initialized",
          "context": {
            "timestamp": "2023-01-01T00:00:00.000Z",
            "options": {
              "cacheSize": 3000,
              "concurrency": 10,
              "timeout": 50,
              "forcedSsrTimeout": 60000,
              "maxRenderTime": 300000,
              "reuseCurrentRendering": true,
              "renderingStrategyResolver": "() => ssr_optimization_options_1.RenderingStrategy.ALWAYS_SSR",
              "logger": "DefaultExpressServerLogger"
            }
          }
        }",
        ]
      `);
    });
  });

  describe('rendering cache', () => {
    it('should be initialized with default optimization options none of the custom options are provided', () => {
      const engineRunner = new TestEngineRunner({});
      expect(
        engineRunner.optimizedSsrEngine['renderingCache']['options']
      ).toEqual(defaultSsrOptimizationOptions);
    });

    it('should be initialized with the provided custom options', () => {
      const engineRunner = new TestEngineRunner({
        cacheSize: 100,
        ttl: 200,
      });
      expect(engineRunner.optimizedSsrEngine['renderingCache']).toBeDefined();
      expect(
        engineRunner.optimizedSsrEngine['renderingCache']['options']
      ).toEqual({
        ...defaultSsrOptimizationOptions,
        cacheSize: 100,
        ttl: 200,
      });
    });
  });

  describe('timeout option', () => {
    it('should fallback to CSR if rendering exceeds timeout', fakeAsync(() => {
      const engineRunner = new TestEngineRunner({ timeout: 50 }).request('a');

      tick(200);
      expect(engineRunner.renders).toEqual(['']);
    }));

    it('should return timed out render in the followup request', fakeAsync(() => {
      const engineRunner = new TestEngineRunner({ timeout: 50 }).request('a');

      tick(200);
      expect(engineRunner.renders).toEqual(['']);

      engineRunner.request('a');
      expect(engineRunner.renders[1]).toEqual('a-0');
    }));

    it('should return render if rendering meets timeout', fakeAsync(() => {
      const engineRunner = new TestEngineRunner({ timeout: 150 }).request('a');

      tick(200);
      expect(engineRunner.renders).toEqual(['a-0']);
    }));

    it('should fallback instantly if is set to 0', () => {
      const engineRunner = new TestEngineRunner({ timeout: 0 }).request('a');

      expect(engineRunner.renders).toEqual(['']);
    });

    it('should return timed out render in the followup request, also when timeout is set to 0', fakeAsync(() => {
      const engineRunner = new TestEngineRunner({ timeout: 0 }).request('a');
      expect(engineRunner.renders).toEqual(['']);
      expect(getCurrentConcurrency(engineRunner)).toEqual({
        currentConcurrency: 1,
      });

      tick(200);
      expect(getCurrentConcurrency(engineRunner)).toEqual({
        currentConcurrency: 0,
      });

      engineRunner.request('a');
      expect(engineRunner.renders[1]).toEqual('a-0');
      expect(getCurrentConcurrency(engineRunner)).toEqual({
        currentConcurrency: 0,
      });
    }));
  });

  describe('no-store cache control header', () => {
    it('should be applied for a fallback', () => {
      const engineRunner = new TestEngineRunner({ timeout: 0 }).request('a');

      expect(engineRunner.renders).toEqual(['']);
      expect(engineRunner.responseParams).toEqual([
        { 'Cache-Control': 'no-store' },
      ]);
    });

    it('should not be applied for a render within time limit', fakeAsync(() => {
      const engineRunner = new TestEngineRunner({ timeout: 200 }).request('a');

      tick(200);
      expect(engineRunner.renders).toEqual(['a-0']);
      expect(engineRunner.responseParams).toEqual([{}]);
    }));
    it('should not be applied for a render served with next response', fakeAsync(() => {
      const engineRunner = new TestEngineRunner({ timeout: 50 }).request('a');

      tick(200);
      engineRunner.request('a');
      expect(engineRunner.renders).toEqual(['', 'a-0']);
      expect(engineRunner.responseParams).toEqual([
        { 'Cache-Control': 'no-store' },
        {},
      ]);
    }));
  });

  describe('cache option', () => {
    it('should not cache requests if disabled', fakeAsync(() => {
      const engineRunner = new TestEngineRunner({
        cache: false,
        timeout: 200,
      }).request('a');

      tick(200);
      engineRunner.request('a');
      tick(200);
      engineRunner.request('a');
      tick(200);
      expect(engineRunner.renders).toEqual(['a-0', 'a-1', 'a-2']);
    }));

    it('should cache requests if enabled', fakeAsync(() => {
      const engineRunner = new TestEngineRunner({
        cache: true,
        timeout: 200,
      }).request('a');
      expect(getCurrentConcurrency(engineRunner)).toEqual({
        currentConcurrency: 1,
      });

      tick(200);

      engineRunner.request('a');
      expect(getCurrentConcurrency(engineRunner)).toEqual({
        currentConcurrency: 0,
      });

      tick(200);

      engineRunner.request('a');
      expect(getCurrentConcurrency(engineRunner)).toEqual({
        currentConcurrency: 0,
      });

      tick(200);

      expect(engineRunner.renders).toEqual(['a-0', 'a-0', 'a-0']);
    }));
  });

  describe('concurrency option', () => {
    it('should limit concurrency and fallback to csr', fakeAsync(() => {
      const engineRunner = new TestEngineRunner({
        concurrency: 3,
        timeout: 200,
      })
        .request('a')
        .request('b')
        .request('c')
        .request('d')
        .request('e');

      tick(200);
      expect(engineRunner.renders).toEqual([
        '', // CSR fallback for 'd'
        '', // CSR fallback for 'e'
        'a-0',
        'b-1',
        'c-2',
      ]);
    }));

    it('should reinvigorate limit after emptying the queue', fakeAsync(() => {
      const engineRunner = new TestEngineRunner({
        concurrency: 2,
        timeout: 200,
      }).request('a');

      tick(60);
      engineRunner.request('b').request('c');
      tick(60);
      engineRunner.request('d').request('e');
      tick(200);
      engineRunner.request('f').request('g');
      tick(200);

      expect(engineRunner.renders).toEqual([
        '', // CSR fallback for 'c'
        'a-0',
        '', // CSR fallback for 'e'
        'b-1',
        'd-2',
        'f-3',
        'g-4',
      ]);
    }));
  });

  describe('ttl option', () => {
    it('should invalidate expired renders', fakeAsync(() => {
      let currentDate = 100;
      jest.spyOn(Date, 'now').mockImplementation(() => currentDate);

      const engineRunner = new TestEngineRunner({
        cache: true,
        ttl: 300,
        timeout: 200,
      }).request('a');

      tick(200);
      currentDate += 200;
      engineRunner.request('a');

      tick(200);
      currentDate += 200;
      engineRunner.request('a');

      tick(200);
      expect(engineRunner.renders).toEqual(['a-0', 'a-0', 'a-1']);
    }));

    it('should not invalidate renders if ttl is not defined', fakeAsync(() => {
      let currentDate = 100;
      jest.spyOn(Date, 'now').mockImplementation(() => currentDate);

      const engineRunner = new TestEngineRunner({
        cache: true,
        timeout: 200,
      }).request('a');

      tick(200);
      currentDate += 200;
      engineRunner.request('a');

      tick(200);
      currentDate += 200;
      engineRunner.request('a');

      tick(200);
      expect(engineRunner.renders).toEqual(['a-0', 'a-0', 'a-0']);
    }));
  });

  describe('renderKeyResolver option', () => {
    describe('default key resolver', () => {
      it('should be used when the custom one is provided', fakeAsync(() => {
        const engineRunner = new TestEngineRunner({
          timeout: 200,
          cache: true,
        });
        jest.spyOn(
          engineRunner.optimizedSsrEngine as any,
          'isConcurrencyLimitExceeded'
        );
        const route = 'home';
        engineRunner.request(route);
        tick(200);

        expect(
          engineRunner.optimizedSsrEngine['isConcurrencyLimitExceeded']
        ).toHaveBeenCalledWith(`https://${host}${route}`);
      }));

      it('should use the X-Forwarded-Host header to resolve the origin', fakeAsync(() => {
        const engineRunner = new TestEngineRunner({
          timeout: 200,
          cache: true,
        });
        jest.spyOn(
          engineRunner.optimizedSsrEngine as any,
          'isConcurrencyLimitExceeded'
        );

        const domain = 'my.shop.com/';
        const route = 'home';
        engineRunner.request(route, {
          httpHeaders: {
            'X-Forwarded-Host': domain,
          },
        });
        tick(200);

        expect(
          engineRunner.optimizedSsrEngine['isConcurrencyLimitExceeded']
        ).toHaveBeenCalledWith(`https://${domain}${route}`);
      }));
    });

    it('should use custom render key resolver', fakeAsync(() => {
      const engineRunner = new TestEngineRunner({
        renderKeyResolver: (req) => req.originalUrl.substring(0, 2),
        timeout: 200,
        cache: true,
      }).request('ala');

      tick(200);
      engineRunner.request('ale');
      tick(200);
      engineRunner.request('ela');
      tick(200);
      engineRunner.request('alu');
      tick(200);
      engineRunner.request('elu');
      tick(200);
      expect(engineRunner.renders).toEqual([
        'ala-0',
        'ala-0',
        'ela-1',
        'ala-0',
        'ela-1',
      ]);
    }));
  });

  describe('renderingStrategyResolver option', () => {
    describe('ALWAYS_SSR', () => {
      it('should ignore timeout', fakeAsync(() => {
        const engineRunner = new TestEngineRunner({
          renderingStrategyResolver: () => RenderingStrategy.ALWAYS_SSR,
          timeout: 50,
          cache: true,
        }).request('a');

        tick(200);
        expect(engineRunner.renders).toEqual(['a-0']);
      }));

      it('should ignore timeout also when it is set to 0', fakeAsync(() => {
        const engineRunner = new TestEngineRunner({
          renderingStrategyResolver: () => RenderingStrategy.ALWAYS_SSR,
          timeout: 0,
          cache: true,
        });

        engineRunner.request('a');

        tick(200);
        expect(engineRunner.renders).toEqual(['a-0']);
      }));

      it('when reuseCurrentRendering is false, it should render each request separately, even if there is already a pending render for the same rendering key', fakeAsync(() => {
        const engineRunner = new TestEngineRunner({
          renderingStrategyResolver: () => RenderingStrategy.ALWAYS_SSR,
          timeout: 200,
          reuseCurrentRendering: false,
        });
        jest.spyOn(
          engineRunner.optimizedSsrEngine as any,
          'expressEngine' // 'expressEngine' is a protected property
        );

        engineRunner.request('a');
        expect(getCurrentConcurrency(engineRunner)).toEqual({
          currentConcurrency: 1,
        });

        tick(1);
        engineRunner.request('a');
        expect(getCurrentConcurrency(engineRunner)).toEqual({
          currentConcurrency: 2,
        });
        expect(engineRunner.renders).toEqual([]);

        tick(100);
        expect(engineRunner.renders).toEqual(['a-0', 'a-1']);
        expect(
          engineRunner.optimizedSsrEngine['expressEngine']
        ).toHaveBeenCalledTimes(2);
        expect(getCurrentConcurrency(engineRunner)).toEqual({
          currentConcurrency: 0,
        });
      }));
    });

    describe('ALWAYS_CSR', () => {
      it('should return CSR instantly', fakeAsync(() => {
        const engineRunner = new TestEngineRunner({
          renderingStrategyResolver: () => RenderingStrategy.ALWAYS_CSR,
          timeout: 200,
          cache: true,
        });

        engineRunner.request('a');

        tick(200);
        engineRunner.request('a');
        tick(200);
        expect(engineRunner.renders).toEqual(['', '']);
      }));

      it('should not start the actual render in the background', fakeAsync(() => {
        const engineRunner = new TestEngineRunner({
          renderingStrategyResolver: () => RenderingStrategy.ALWAYS_CSR,
          timeout: 200,
          cache: true,
        });
        jest.spyOn(
          engineRunner.optimizedSsrEngine as any,
          'expressEngine' // 'expressEngine' is a protected property
        );

        engineRunner.request('a');
        expect(engineRunner.renders).toEqual(['']);

        expect(
          engineRunner.optimizedSsrEngine['expressEngine']
        ).not.toHaveBeenCalled();
      }));
    });

    describe('DEFAULT', () => {
      it('should obey the timeout', fakeAsync(() => {
        const engineRunner = new TestEngineRunner({
          renderingStrategyResolver: () => RenderingStrategy.DEFAULT,
          timeout: 50,
        });

        engineRunner.request('a');

        tick(200);
        engineRunner.request('a');
        expect(engineRunner.renders).toEqual(['', 'a-0']);
      }));

      it('when reuseCurrentRendering is false, it should fallback to CSR when there is already pending a render for the same rendering key', fakeAsync(() => {
        const engineRunner = new TestEngineRunner({
          renderingStrategyResolver: () => RenderingStrategy.DEFAULT,
          timeout: 200,
          reuseCurrentRendering: false,
        }).request('a');
        expect(getCurrentConcurrency(engineRunner)).toEqual({
          currentConcurrency: 1,
        });

        tick(1);
        engineRunner.request('a');
        expect(getCurrentConcurrency(engineRunner)).toEqual({
          currentConcurrency: 1,
        });

        expect(engineRunner.renders).toEqual(['']); // immediate fallback to CSR for the 2nd request for the same key

        tick(100);
        expect(engineRunner.renders).toEqual(['', 'a-0']);
        expect(getCurrentConcurrency(engineRunner)).toEqual({
          currentConcurrency: 0,
        });
      }));
    });

    describe('custom resolver function', () => {
      it('should return different strategies for different types of request', fakeAsync(() => {
        const engineRunner = new TestEngineRunner({
          renderingStrategyResolver: (req) =>
            req.get('User-Agent')?.match(/bot|crawl|slurp|spider|mediapartners/)
              ? RenderingStrategy.ALWAYS_SSR
              : RenderingStrategy.DEFAULT,
          timeout: 50,
        });

        engineRunner.request('a');
        engineRunner.request('a', { httpHeaders: { 'User-Agent': 'bot' } });
        tick(200);

        expect(engineRunner.renders).toEqual(['', 'a-1']);
      }));
    });
  });

  describe('forcedSsrTimeout option', () => {
    it('should fallback to CSR when forcedSsrTimeout timeout is exceeded for ALWAYS_SSR rendering strategy, and return the timed out render in the followup request', fakeAsync(() => {
      const engineRunner = new TestEngineRunner({
        renderingStrategyResolver: () => RenderingStrategy.ALWAYS_SSR,
        timeout: 50,
        forcedSsrTimeout: 80,
      });

      engineRunner.request('a');
      expect(getCurrentConcurrency(engineRunner)).toEqual({
        currentConcurrency: 1,
      });

      tick(60);
      expect(engineRunner.renders).toEqual([]);
      tick(50);
      expect(engineRunner.renders).toEqual(['']);
      expect(getCurrentConcurrency(engineRunner)).toEqual({
        currentConcurrency: 0,
      });

      engineRunner.request('a');
      expect(engineRunner.renders).toEqual(['', 'a-0']);
      expect(getCurrentConcurrency(engineRunner)).toEqual({
        currentConcurrency: 0,
      });
    }));

    it('should not affect DEFAULT rendering strategy', fakeAsync(() => {
      const engineRunner = new TestEngineRunner({
        timeout: 50,
        forcedSsrTimeout: 80,
      });

      engineRunner.request('a');

      tick(60);
      expect(engineRunner.renders).toEqual(['']);

      tick(50);
      engineRunner.request('a');
      expect(engineRunner.renders).toEqual(['', 'a-0']);
    }));
  });
  describe('maxRenderTime option', () => {
    const fiveMinutes = 300000;

    it('should not kick-in for the non-hanging (normal) renders', fakeAsync(() => {
      const renderTime = 10;
      const requestUrl = 'a';
      const engineRunner = new TestEngineRunner({}, renderTime).request(
        requestUrl
      );
      jest.spyOn(engineRunner.optimizedSsrEngine as any, 'log');

      tick(renderTime + 1);
      expect(engineRunner.renderCount).toEqual(1);
      expect(engineRunner.optimizedSsrEngine['log']).not.toHaveBeenCalledWith(
        `Rendering of ${requestUrl} was not able to complete. This might cause memory leaks!`,
        false
      );
    }));

    it('should use the default value of 5 minutes for hanging renders', fakeAsync(() => {
      const requestUrl = 'a';
      const renderTime = fiveMinutes + 100;
      const engineRunner = new TestEngineRunner({}, renderTime).request(
        requestUrl
      );
      jest.spyOn(engineRunner.optimizedSsrEngine as any, 'log');

      tick(fiveMinutes);
      expect(engineRunner.renderCount).toEqual(0);
      expect(engineRunner.optimizedSsrEngine['log']).toHaveBeenCalledWith(
        `Rendering of ${requestUrl} was not able to complete. This might cause memory leaks!`,
        false,
        { request: expect.objectContaining({ originalUrl: requestUrl }) }
      );

      tick(101);
      expect(engineRunner.renderCount).toEqual(1);
    }));

    it('should use the provided value instead of the default one', fakeAsync(() => {
      const requestUrl = 'a';
      const renderTime = 200;
      const maxRenderTime = renderTime - 50; // shorter than the predicted render time
      const engineRunner = new TestEngineRunner(
        {
          maxRenderTime,
          timeout: undefined,
        },
        renderTime
      ).request(requestUrl);
      jest.spyOn(engineRunner.optimizedSsrEngine as any, 'log');

      tick(maxRenderTime);
      expect(engineRunner.renderCount).toEqual(0);
      expect(engineRunner.optimizedSsrEngine['log']).toHaveBeenCalledWith(
        `Rendering of ${requestUrl} was not able to complete. This might cause memory leaks!`,
        false,
        { request: expect.objectContaining({ originalUrl: requestUrl }) }
      );

      tick(50);
      expect(engineRunner.renderCount).toEqual(1);
    }));

    it('should release the concurrency slot for the hanging render', fakeAsync(() => {
      const hangingRequest = 'a';
      const csrRequest = 'b';
      const ssrRequest = 'c';
      const renderTime = 200;
      const maxRenderTime = renderTime - 50; // shorter than the predicted render time
      const engineRunner = new TestEngineRunner(
        { concurrency: 1, maxRenderTime },
        renderTime
      );
      jest.spyOn(engineRunner.optimizedSsrEngine as any, 'log');

      // issue two requests
      engineRunner.request(hangingRequest);
      engineRunner.request(csrRequest);
      expect(getCurrentConcurrency(engineRunner)).toEqual({
        currentConcurrency: 1,
      });

      tick(1);
      // while the concurrency slot is busy rendering the first hanging request, the second request gets the CSR version
      expect(engineRunner.optimizedSsrEngine['log']).toHaveBeenCalledWith(
        `CSR fallback: Concurrency limit exceeded (1)`,
        true,
        { request: expect.objectContaining({ originalUrl: csrRequest }) }
      );
      expect(engineRunner.renderCount).toEqual(0);
      expect(getCurrentConcurrency(engineRunner)).toEqual({
        currentConcurrency: 1,
      });

      tick(maxRenderTime);
      expect(engineRunner.optimizedSsrEngine['log']).toHaveBeenCalledWith(
        `Rendering of ${hangingRequest} was not able to complete. This might cause memory leaks!`,
        false,
        { request: expect.objectContaining({ originalUrl: hangingRequest }) }
      );
      expect(engineRunner.renderCount).toEqual(0);

      // even though the hanging request is still rendering, we've freed up a slot for a new request
      engineRunner.request(ssrRequest);
      tick(1);
      expect(engineRunner.optimizedSsrEngine['log']).toHaveBeenCalledWith(
        `Rendering started (${ssrRequest})`,
        true,
        { request: expect.objectContaining({ originalUrl: ssrRequest }) }
      );
      expect(getCurrentConcurrency(engineRunner)).toEqual({
        currentConcurrency: 1,
      });

      flush();
    }));

    it('should not cache the result of the hanging render, even when it succeeds after `maxRenderTime`', fakeAsync(() => {
      const requestUrl = 'a';
      const renderTime = fiveMinutes + 100;
      const engineRunner = new TestEngineRunner(
        {
          timeout: 200,
          cache: true,
        },
        renderTime
      ).request(requestUrl);
      jest.spyOn(engineRunner.optimizedSsrEngine as any, 'log');
      expect(engineRunner.renders).toEqual([]);

      tick(fiveMinutes + 101);
      expect(engineRunner.optimizedSsrEngine['log']).toHaveBeenCalledWith(
        `Rendering of ${requestUrl} completed after the specified maxRenderTime, therefore it was ignored.`,
        false,
        { request: expect.objectContaining({ originalUrl: requestUrl }) }
      );
      expect(engineRunner.renders).toEqual(['']);

      engineRunner.request(requestUrl);
      expect(engineRunner.renders).toEqual(['']); // if the result was cached, the 2nd request would get immediately 'a-0'
      flush();
    }));
  });

  describe('reuseCurrentRendering', () => {
    const requestUrl = 'a';
    const differentUrl = 'b';

    const getRenderingKey = (requestUrlStr: string): string =>
      `https://${host}${requestUrlStr}`;
    const getRenderCallbacksCount = (
      engineRunner: TestEngineRunner,
      requestUrlStr: string
    ): { renderCallbacksCount: number } => {
      return {
        renderCallbacksCount:
          engineRunner.optimizedSsrEngine['renderCallbacks'].get(
            getRenderingKey(requestUrlStr)
          )?.length ?? 0,
      };
    };

    describe('when disabled', () => {
      it('should fallback to CSR for parallel subsequent requests for the same rendering key', fakeAsync(() => {
        const timeout = 300;
        const engineRunner = new TestEngineRunner(
          { timeout, reuseCurrentRendering: false },
          400
        );
        jest.spyOn(engineRunner.optimizedSsrEngine as any, 'log');

        engineRunner.request(requestUrl);
        expect(getRenderCallbacksCount(engineRunner, requestUrl)).toEqual({
          renderCallbacksCount: 0,
        });

        tick(200);
        engineRunner.request(requestUrl);
        expect(getRenderCallbacksCount(engineRunner, requestUrl)).toEqual({
          renderCallbacksCount: 0,
        });

        tick(100);

        expect(engineRunner.optimizedSsrEngine['log']).toHaveBeenCalledWith(
          `CSR fallback: rendering in progress (${requestUrl})`,
          true,
          { request: expect.objectContaining({ originalUrl: requestUrl }) }
        );
        expect(engineRunner.optimizedSsrEngine['log']).toHaveBeenCalledWith(
          `SSR rendering exceeded timeout ${timeout}, fallbacking to CSR for ${requestUrl}`,
          false,
          { request: expect.objectContaining({ originalUrl: requestUrl }) }
        );
        expect(engineRunner.renders).toEqual(['', '']);

        flush();
      }));
    });

    describe('when enabled', () => {
      describe('multiple subsequent requests for the same rendering key should reuse the same render', () => {
        it('and the first request should timeout', fakeAsync(() => {
          const timeout = 300;
          const engineRunner = new TestEngineRunner(
            { timeout, reuseCurrentRendering: true },
            400
          );
          jest.spyOn(engineRunner.optimizedSsrEngine as any, 'log');

          engineRunner.request(requestUrl);
          tick(200);

          engineRunner.request(requestUrl);

          tick(100);
          expect(engineRunner.optimizedSsrEngine['log']).toHaveBeenCalledWith(
            `SSR rendering exceeded timeout ${timeout}, fallbacking to CSR for ${requestUrl}`,
            false,
            { request: expect.objectContaining({ originalUrl: requestUrl }) }
          );

          tick(100);
          expect(engineRunner.renderCount).toEqual(1);
          expect(engineRunner.renders).toEqual(['', `${requestUrl}-0`]);
          flush();
        }));

        it('and honour the timeout option', fakeAsync(() => {
          const logSpy = jest.fn();
          const timeout = 300;
          const engineRunner = new TestEngineRunner(
            { timeout, reuseCurrentRendering: true },
            1000
          );
          engineRunner.optimizedSsrEngine['log'] = logSpy;

          engineRunner.request(requestUrl);

          tick(200);

          engineRunner.request(requestUrl);

          //1st times out
          tick(100);
          // 2nd request times out
          tick(200);

          let renderExceedMessageCount = 0;

          logSpy.mock.calls.forEach((call) => {
            const messageArg = call[0];
            if (
              messageArg ===
              `SSR rendering exceeded timeout ${timeout}, fallbacking to CSR for ${requestUrl}`
            ) {
              renderExceedMessageCount++;
            }
          });

          expect(renderExceedMessageCount).toBe(2);
          expect(engineRunner.renderCount).toEqual(0);
          expect(engineRunner.renders).toEqual(['', '']);

          flush();
        }));

        it('also when the rendering strategy is ALWAYS_SSR', fakeAsync(() => {
          const timeout = 300;
          const engineRunner = new TestEngineRunner(
            {
              timeout,
              reuseCurrentRendering: true,
              renderingStrategyResolver: () => RenderingStrategy.ALWAYS_SSR,
            },
            400
          );

          engineRunner.request(requestUrl);
          expect(getCurrentConcurrency(engineRunner)).toEqual({
            currentConcurrency: 1,
          });
          expect(getRenderCallbacksCount(engineRunner, requestUrl)).toEqual({
            renderCallbacksCount: 1,
          });

          tick(200);
          engineRunner.request(requestUrl);
          expect(getCurrentConcurrency(engineRunner)).toEqual({
            currentConcurrency: 1,
          });
          expect(getRenderCallbacksCount(engineRunner, requestUrl)).toEqual({
            renderCallbacksCount: 2,
          });

          tick(200);

          expect(engineRunner.renderCount).toEqual(1);
          expect(engineRunner.renders).toEqual([
            `${requestUrl}-0`,
            `${requestUrl}-0`,
          ]);
          flush();
        }));

        it('and take up only one concurrent slot', fakeAsync(() => {
          const timeout = 300;
          const engineRunner = new TestEngineRunner(
            { timeout, reuseCurrentRendering: true, concurrency: 2 },
            400
          );
          jest.spyOn(engineRunner.optimizedSsrEngine as any, 'log');

          // start 1st request
          engineRunner.request(requestUrl);
          expect(getCurrentConcurrency(engineRunner)).toEqual({
            currentConcurrency: 1,
          });
          expect(getRenderCallbacksCount(engineRunner, requestUrl)).toEqual({
            renderCallbacksCount: 1,
          });

          // start 2nd request
          tick(200);
          engineRunner.request(requestUrl);
          expect(getCurrentConcurrency(engineRunner)).toEqual({
            currentConcurrency: 1,
          });
          expect(getRenderCallbacksCount(engineRunner, requestUrl)).toEqual({
            renderCallbacksCount: 2,
          });

          // start 3rd request
          engineRunner.request(requestUrl);
          expect(getRenderCallbacksCount(engineRunner, requestUrl)).toEqual({
            renderCallbacksCount: 3,
          });
          expect(getCurrentConcurrency(engineRunner)).toEqual({
            currentConcurrency: 1,
          });

          // 1st request timeout
          tick(100);
          expect(engineRunner.optimizedSsrEngine['log']).toHaveBeenCalledWith(
            `SSR rendering exceeded timeout ${timeout}, fallbacking to CSR for ${requestUrl}`,
            false,
            { request: expect.objectContaining({ originalUrl: requestUrl }) }
          );
          expect(engineRunner.renders).toEqual(['']); // the first request fallback to CSR due to timeout
          expect(getCurrentConcurrency(engineRunner)).toEqual({
            currentConcurrency: 1,
          }); // the render still continues in the background

          // eventually the render succeeds and 2 remaining requests get the same response:
          tick(100);
          expect(engineRunner.renderCount).toEqual(1);
          expect(engineRunner.renders).toEqual([
            '', // CSR fallback of the 1st request due to it timed out
            `${requestUrl}-0`,
            `${requestUrl}-0`,
          ]);
          expect(getRenderCallbacksCount(engineRunner, requestUrl)).toEqual({
            renderCallbacksCount: 0,
          });
          expect(getCurrentConcurrency(engineRunner)).toEqual({
            currentConcurrency: 0,
          });

          flush();
        }));

        it('and concurrency limit should NOT fallback to CSR, when the request is for a pending render', fakeAsync(() => {
          const engineRunner = new TestEngineRunner({
            reuseCurrentRendering: true,
            timeout: 200,
            concurrency: 1,
          });
          jest.spyOn(engineRunner.optimizedSsrEngine as any, 'log');

          engineRunner.request('a');
          engineRunner.request('a');

          tick(200);
          expect(
            engineRunner.optimizedSsrEngine['log']
          ).not.toHaveBeenCalledWith(
            `CSR fallback: Concurrency limit exceeded (1)`
          );
          expect(engineRunner.renders).toEqual(['a-0', 'a-0']);
        }));

        it('combined with a different request should take up two concurrency slots', fakeAsync(() => {
          const timeout = 300;
          const engineRunner = new TestEngineRunner(
            { timeout, reuseCurrentRendering: true, concurrency: 2 },
            200
          );

          engineRunner
            .request(requestUrl)
            .request(requestUrl)
            .request(requestUrl)
            .request(requestUrl)
            .request(requestUrl);

          tick(20);
          expect(getRenderCallbacksCount(engineRunner, requestUrl)).toEqual({
            renderCallbacksCount: 5,
          });
          expect(getCurrentConcurrency(engineRunner)).toEqual({
            currentConcurrency: 1,
          });

          engineRunner.request(differentUrl);
          tick(20);
          expect(getRenderCallbacksCount(engineRunner, differentUrl)).toEqual({
            renderCallbacksCount: 1,
          });
          expect(getCurrentConcurrency(engineRunner)).toEqual({
            currentConcurrency: 2,
          });

          tick(250);
          expect(engineRunner.renders).toEqual([
            'a-0',
            'a-0',
            'a-0',
            'a-0',
            'a-0',
            'b-1',
          ]);
          expect(getRenderCallbacksCount(engineRunner, requestUrl)).toEqual({
            renderCallbacksCount: 0,
          });
          expect(getRenderCallbacksCount(engineRunner, differentUrl)).toEqual({
            renderCallbacksCount: 0,
          });
          expect(getCurrentConcurrency(engineRunner)).toEqual({
            currentConcurrency: 0,
          });

          flush();
        }));
      });

      describe('combined with maxRenderTime option', () => {
        it('should free up only one concurrent slot when the render is hanging for many waiting requests', fakeAsync(() => {
          const hangingRequest = 'a';
          const ssrRequest = 'b';

          const renderTime = 200;
          const maxRenderTime = renderTime - 50; // shorter than the predicted render time
          const engineRunner = new TestEngineRunner(
            { concurrency: 2, maxRenderTime, reuseCurrentRendering: true },
            renderTime
          );
          jest.spyOn(engineRunner.optimizedSsrEngine as any, 'log');

          engineRunner.request(hangingRequest);
          engineRunner.request(hangingRequest);
          engineRunner.request(hangingRequest);

          tick(1);
          expect(engineRunner.renderCount).toEqual(0);
          expect(getCurrentConcurrency(engineRunner)).toEqual({
            currentConcurrency: 1,
          });
          expect(getRenderCallbacksCount(engineRunner, hangingRequest)).toEqual(
            {
              renderCallbacksCount: 3,
            }
          );

          tick(maxRenderTime);
          expect(engineRunner.optimizedSsrEngine['log']).toHaveBeenCalledWith(
            `Rendering of ${hangingRequest} was not able to complete. This might cause memory leaks!`,
            false,
            { request: expect.objectContaining({ originalUrl: requestUrl }) }
          );
          expect(getCurrentConcurrency(engineRunner)).toEqual({
            currentConcurrency: 0,
          });
          expect(getRenderCallbacksCount(engineRunner, hangingRequest)).toEqual(
            {
              renderCallbacksCount: 0,
            }
          );

          // even though the hanging request is still rendering, we've freed up a slot for a new request
          engineRunner.request(ssrRequest);
          tick(1);
          expect(engineRunner.optimizedSsrEngine['log']).toHaveBeenCalledWith(
            `Rendering started (${ssrRequest})`,
            true,
            { request: expect.objectContaining({ originalUrl: ssrRequest }) }
          );
          expect(getCurrentConcurrency(engineRunner)).toEqual({
            currentConcurrency: 1,
          });
          expect(getRenderCallbacksCount(engineRunner, ssrRequest)).toEqual({
            renderCallbacksCount: 1,
          });

          flush();

          expect(getCurrentConcurrency(engineRunner)).toEqual({
            currentConcurrency: 0,
          });
          expect(getRenderCallbacksCount(engineRunner, ssrRequest)).toEqual({
            renderCallbacksCount: 0,
          });
        }));
      });

      it('should perform separate renders for different rendering keys', fakeAsync(() => {
        const timeout = 300;
        const engineRunner = new TestEngineRunner(
          { timeout, reuseCurrentRendering: true },
          400
        );
        jest.spyOn(engineRunner.optimizedSsrEngine as any, 'log');

        engineRunner.request(requestUrl);
        tick(200);

        engineRunner.request(differentUrl);
        tick(300);

        expect(engineRunner.optimizedSsrEngine['log']).toHaveBeenCalledWith(
          `SSR rendering exceeded timeout ${timeout}, fallbacking to CSR for ${requestUrl}`,
          false,
          { request: expect.objectContaining({ originalUrl: requestUrl }) }
        );
        expect(engineRunner.optimizedSsrEngine['log']).toHaveBeenCalledWith(
          `SSR rendering exceeded timeout ${timeout}, fallbacking to CSR for ${differentUrl}`,
          false,
          { request: expect.objectContaining({ originalUrl: differentUrl }) }
        );

        expect(engineRunner.renderCount).toEqual(1);
        expect(engineRunner.renders).toEqual(['', '']);

        flush();
      }));
    });
  });

  describe('logger option', () => {
    let dateSpy: jest.SpyInstance;

    beforeEach(() => {
      const mockDate = new Date('2023-01-01');
      dateSpy = jest
        .spyOn(global, 'Date')
        .mockImplementationOnce(() => mockDate);
    });

    afterAll(() => {
      dateSpy.mockRestore();
    });

    it('should use the default server logger, if custom logger is not specified', () => {
      new TestEngineRunner({});
      expect(consoleLogSpy.mock.lastCall).toMatchInlineSnapshot(`
        [
          "{
          "message": "[spartacus] SSR optimization engine initialized",
          "context": {
            "timestamp": "2023-01-01T00:00:00.000Z",
            "options": {
              "cacheSize": 3000,
              "concurrency": 10,
              "timeout": 3000,
              "forcedSsrTimeout": 60000,
              "maxRenderTime": 300000,
              "reuseCurrentRendering": true,
              "renderingStrategyResolver": "(request) => {\\n    if (hasExcludedUrl(request, defaultAlwaysCsrOptions.excludedUrls)) {\\n        return ssr_optimization_options_1.RenderingStrategy.ALWAYS_CSR;\\n    }\\n    return shouldFallbackToCsr(request, options)\\n        ? ssr_optimization_options_1.RenderingStrategy.ALWAYS_CSR\\n        : ssr_optimization_options_1.RenderingStrategy.DEFAULT;\\n}",
              "logger": "DefaultExpressServerLogger"
            }
          }
        }",
        ]
      `);
    });

    it('should use the provided logger', () => {
      new TestEngineRunner({
        logger: new MockExpressServerLogger() as ExpressServerLogger,
      });
      expect(consoleLogSpy.mock.lastCall).toMatchInlineSnapshot(`
            [
              "[spartacus] SSR optimization engine initialized",
              {
                "options": {
                  "cacheSize": 3000,
                  "concurrency": 10,
                  "forcedSsrTimeout": 60000,
                  "logger": "MockExpressServerLogger",
                  "maxRenderTime": 300000,
                  "renderingStrategyResolver": "(request) => {
                if (hasExcludedUrl(request, defaultAlwaysCsrOptions.excludedUrls)) {
                    return ssr_optimization_options_1.RenderingStrategy.ALWAYS_CSR;
                }
                return shouldFallbackToCsr(request, options)
                    ? ssr_optimization_options_1.RenderingStrategy.ALWAYS_CSR
                    : ssr_optimization_options_1.RenderingStrategy.DEFAULT;
            }",
                  "reuseCurrentRendering": true,
                  "timeout": 3000,
                },
              },
            ]
                  `);
    });
  });
});
