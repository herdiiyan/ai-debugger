---
name: prod-debug-local-tracing
description: Used when the user reports an issue or error in the production environment and requires structured guidance to replicate, trace, and fix the issue locally in the development environment.
---

# Production Issue Tracing & Local Debugging Guide

Follow this structured workflow to safely identify, replicate, and resolve production issues in your local development environment:

## Phase 1: Gathering Issue Context
1. **Retrieve Stack Traces & Error Logs**: Collect full log traces from the production server or monitoring tools (e.g., Sentry, CloudWatch, Datadog).
2. **Identify Request Payload & State**: Obtain input data (request bodies, query parameters, headers, and user states) that triggered the error.
3. **Align Code Version**: Ensure your local repository branch matches the production code version (e.g., checkout to the specific release tag or commit hash).

## Phase 2: Local Replication & Environment Setup
1. **Align Environment Variables**: Check and simulate relevant production environment variables (excluding sensitive keys) that affect business logic locally.
2. **Mock Data Setup**: If the issue is tied to specific database records, replicate a safe, mock version of that data in your local environment.
3. **Leverage `ai-debugger` (for web apps)**:
   - Press `Ctrl + Shift + D` to toggle visual inspect mode.
   - Use the auto-reproduction steps or record network and console logs to capture the state before the crash.

## Phase 3: Code Tracing & Isolation
1. **Pinpoint the Failure Point**: Using the stack trace, locate the exact file, class, method, and line number causing the exception.
2. **Inject Debugging Breakpoints / Logs**:
   - If using Node.js/TypeScript, set VS Code breakpoints or insert temporary tracing logs:
     ```typescript
     console.log('[DEBUG-TRACE] Pre-error state:', JSON.stringify(targetState, null, 2));
     ```
3. **Execute Local Workflows**: Trigger the buggy flow using cURL, Postman, or local UI inputs to verify if the issue replicates locally.

## Phase 4: Root Cause Analysis & Resolution
1. **Analyze System Differences**: Determine why the issue occurred in production but might not occur locally under standard conditions (e.g., resource limits, API timeouts, race conditions, or DB locking).
2. **Implement Defensive Fixes**: Apply robust, clean fixes (e.g., null-checking, proper error-catching, timeout handling, or input validation).
   - Ensure the implemented code fully complies with Sonar/SonarQube rules to avoid adding new code smells or vulnerabilities.
   - Verify that the fix is covered by comprehensive unit tests to achieve high test coverage.
3. **Verify locally**: Re-run the flow locally and verify that trace logs confirm a successful execution.

## Phase 5: Testing & Verification
1. **Create Regression Tests**: Write automated unit or integration tests representing the failure state to prevent the issue from re-occurring in future releases.
2. **Clean Up Tracing Code**: Remove any temporary debugging logs (`console.log`) before committing and pushing the changes.
