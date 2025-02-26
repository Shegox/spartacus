/*
 * SPDX-FileCopyrightText: 2024 SAP Spartacus team <spartacus-team@sap.com>
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  AUTH_ACTIONS,
  LOAD_CLIENT_TOKEN,
  LOAD_CLIENT_TOKEN_CLASS,
  LOAD_CLIENT_TOKEN_FAIL,
  LOAD_CLIENT_TOKEN_FAIL_CLASS,
  LOAD_CLIENT_TOKEN_SUCCESS,
  LOAD_CLIENT_TOKEN_SUCCESS_CLASS,
  LOAD_USER_TOKEN,
  LOAD_USER_TOKEN_CLASS,
  LOAD_USER_TOKEN_FAIL,
  LOAD_USER_TOKEN_FAIL_CLASS,
  LOAD_USER_TOKEN_SUCCESS,
  LOAD_USER_TOKEN_SUCCESS_CLASS,
  LOGOUT_CUSTOMER_SUPPORT_AGENT,
  REFRESH_USER_TOKEN,
  REFRESH_USER_TOKEN_CLASS,
  REFRESH_USER_TOKEN_FAIL,
  REFRESH_USER_TOKEN_FAIL_CLASS,
  REFRESH_USER_TOKEN_SUCCESS,
  REFRESH_USER_TOKEN_SUCCESS_CLASS,
  REVOKE_USER_TOKEN,
  REVOKE_USER_TOKEN_CLASS,
  REVOKE_USER_TOKEN_FAIL,
  REVOKE_USER_TOKEN_FAIL_CLASS,
  REVOKE_USER_TOKEN_SUCCESS,
  REVOKE_USER_TOKEN_SUCCESS_CLASS,
  TODO_SPARTACUS,
} from '../../../../shared/constants';
import { SPARTACUS_CORE } from '../../../../shared/libs-constants';
import { MethodPropertyDeprecation } from '../../../../shared/utils/file-utils';

export const AUTH_ACTIONS_MIGRATION: MethodPropertyDeprecation[] = [
  {
    class: AUTH_ACTIONS,
    importPath: SPARTACUS_CORE,
    deprecatedNode: LOAD_CLIENT_TOKEN,
    comment: `// ${TODO_SPARTACUS} Variable available under 'ClientAuthActions' namespace.`,
  },
  {
    class: AUTH_ACTIONS,
    importPath: SPARTACUS_CORE,
    deprecatedNode: LOAD_CLIENT_TOKEN_FAIL,
    comment: `// ${TODO_SPARTACUS} Variable available under 'ClientAuthActions' namespace.`,
  },
  {
    class: AUTH_ACTIONS,
    importPath: SPARTACUS_CORE,
    deprecatedNode: LOAD_CLIENT_TOKEN_SUCCESS,
    comment: `// ${TODO_SPARTACUS} Variable available under 'ClientAuthActions' namespace.`,
  },
  {
    class: AUTH_ACTIONS,
    importPath: SPARTACUS_CORE,
    deprecatedNode: LOAD_CLIENT_TOKEN_CLASS,
    comment: `// ${TODO_SPARTACUS} Action available under 'ClientAuthActions' namespace.`,
  },
  {
    class: AUTH_ACTIONS,
    importPath: SPARTACUS_CORE,
    deprecatedNode: LOAD_CLIENT_TOKEN_FAIL_CLASS,
    comment: `// ${TODO_SPARTACUS} Action available under 'ClientAuthActions' namespace.`,
  },
  {
    class: AUTH_ACTIONS,
    importPath: SPARTACUS_CORE,
    deprecatedNode: LOAD_CLIENT_TOKEN_SUCCESS_CLASS,
    comment: `// ${TODO_SPARTACUS} Action available under 'ClientAuthActions' namespace.`,
  },
  {
    class: AUTH_ACTIONS,
    importPath: SPARTACUS_CORE,
    deprecatedNode: LOGOUT_CUSTOMER_SUPPORT_AGENT,
    comment: `// ${TODO_SPARTACUS} Variable available under 'AsmActions' namespace.`,
  },
  {
    class: AUTH_ACTIONS,
    importPath: SPARTACUS_CORE,
    deprecatedNode: LOAD_USER_TOKEN,
    comment: `// ${TODO_SPARTACUS} Action removed. Look for replacement in 'AuthService' and 'OAuthLibWrapperService'.`,
  },
  {
    class: AUTH_ACTIONS,
    importPath: SPARTACUS_CORE,
    deprecatedNode: LOAD_USER_TOKEN_CLASS,
    comment: `// ${TODO_SPARTACUS} Action removed. Look for replacement in 'AuthService' and 'OAuthLibWrapperService'.`,
  },
  {
    class: AUTH_ACTIONS,
    importPath: SPARTACUS_CORE,
    deprecatedNode: LOAD_USER_TOKEN_FAIL,
    comment: `// ${TODO_SPARTACUS} Action removed. Look for replacement in 'AuthService' and 'OAuthLibWrapperService'.`,
  },
  {
    class: AUTH_ACTIONS,
    importPath: SPARTACUS_CORE,
    deprecatedNode: LOAD_USER_TOKEN_FAIL_CLASS,
    comment: `// ${TODO_SPARTACUS} Action removed. Look for replacement in 'AuthService' and 'OAuthLibWrapperService'.`,
  },
  {
    class: AUTH_ACTIONS,
    importPath: SPARTACUS_CORE,
    deprecatedNode: LOAD_USER_TOKEN_SUCCESS,
    comment: `// ${TODO_SPARTACUS} Action removed. Look for replacement in 'AuthService' and 'OAuthLibWrapperService'.`,
  },
  {
    class: AUTH_ACTIONS,
    importPath: SPARTACUS_CORE,
    deprecatedNode: LOAD_USER_TOKEN_SUCCESS_CLASS,
    comment: `// ${TODO_SPARTACUS} Action removed. Look for replacement in 'AuthService' and 'OAuthLibWrapperService'.`,
  },
  {
    class: AUTH_ACTIONS,
    importPath: SPARTACUS_CORE,
    deprecatedNode: REFRESH_USER_TOKEN,
    comment: `// ${TODO_SPARTACUS} Action removed. Look for replacement in 'OAuthLibWrapperService'.`,
  },
  {
    class: AUTH_ACTIONS,
    importPath: SPARTACUS_CORE,
    deprecatedNode: REFRESH_USER_TOKEN_CLASS,
    comment: `// ${TODO_SPARTACUS} Action removed. Look for replacement in 'OAuthLibWrapperService'.`,
  },
  {
    class: AUTH_ACTIONS,
    importPath: SPARTACUS_CORE,
    deprecatedNode: REFRESH_USER_TOKEN_FAIL,
    comment: `// ${TODO_SPARTACUS} Action removed. Look for replacement in 'OAuthLibWrapperService'.`,
  },
  {
    class: AUTH_ACTIONS,
    importPath: SPARTACUS_CORE,
    deprecatedNode: REFRESH_USER_TOKEN_FAIL_CLASS,
    comment: `// ${TODO_SPARTACUS} Action removed. Look for replacement in 'OAuthLibWrapperService'.`,
  },
  {
    class: AUTH_ACTIONS,
    importPath: SPARTACUS_CORE,
    deprecatedNode: REFRESH_USER_TOKEN_SUCCESS,
    comment: `// ${TODO_SPARTACUS} Action removed. Look for replacement in 'OAuthLibWrapperService'.`,
  },
  {
    class: AUTH_ACTIONS,
    importPath: SPARTACUS_CORE,
    deprecatedNode: REFRESH_USER_TOKEN_SUCCESS_CLASS,
    comment: `// ${TODO_SPARTACUS} Action removed. Look for replacement in 'OAuthLibWrapperService'.`,
  },
  {
    class: AUTH_ACTIONS,
    importPath: SPARTACUS_CORE,
    deprecatedNode: REVOKE_USER_TOKEN,
    comment: `// ${TODO_SPARTACUS} Action removed. Look for replacement in 'AuthService' and 'OAuthLibWrapperService'.`,
  },
  {
    class: AUTH_ACTIONS,
    importPath: SPARTACUS_CORE,
    deprecatedNode: REVOKE_USER_TOKEN_CLASS,
    comment: `// ${TODO_SPARTACUS} Action removed. Look for replacement in 'AuthService' and 'OAuthLibWrapperService'.`,
  },
  {
    class: AUTH_ACTIONS,
    importPath: SPARTACUS_CORE,
    deprecatedNode: REVOKE_USER_TOKEN_FAIL,
    comment: `// ${TODO_SPARTACUS} Action removed. Look for replacement in 'AuthService' and 'OAuthLibWrapperService'.`,
  },
  {
    class: AUTH_ACTIONS,
    importPath: SPARTACUS_CORE,
    deprecatedNode: REVOKE_USER_TOKEN_FAIL_CLASS,
    comment: `// ${TODO_SPARTACUS} Action removed. Look for replacement in 'AuthService' and 'OAuthLibWrapperService'.`,
  },
  {
    class: AUTH_ACTIONS,
    importPath: SPARTACUS_CORE,
    deprecatedNode: REVOKE_USER_TOKEN_SUCCESS,
    comment: `// ${TODO_SPARTACUS} Action removed. Look for replacement in 'AuthService' and 'OAuthLibWrapperService'.`,
  },
  {
    class: AUTH_ACTIONS,
    importPath: SPARTACUS_CORE,
    deprecatedNode: REVOKE_USER_TOKEN_SUCCESS_CLASS,
    comment: `// ${TODO_SPARTACUS} Action removed. Look for replacement in 'AuthService' and 'OAuthLibWrapperService'.`,
  },
];
