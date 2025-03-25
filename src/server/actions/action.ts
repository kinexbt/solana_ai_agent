import {
  CoreTool,
  NoSuchToolError,
  appendResponseMessages,
  generateObject,
  generateText,
} from 'ai';
import _, { uniqueId } from 'lodash';
import moment from 'moment';
import { z } from 'zod';

import {
  defaultModel,
  defaultSystemPrompt,
  defaultTools,
  getToolsFromRequiredTools,
} from '@/ai/providers';
import prisma from '@/lib/prisma';
import { isValidTokenUsage, logWithTiming } from '@/lib/utils';
import {
  dbCreateMessages,
  dbCreateTokenStat,
  dbGetConversation,
} from '@/server/db/queries';
import { ActionWithUser } from '@/types/db';

import { retrieveAgentKitServer } from '../utils';
import { getToolsFromOrchestrator } from './orchestrator';

const ACTION_PAUSE_THRESHOLD = 3;

export async function processAction(action: ActionWithUser) {
  const startTime = performance.now();
  console.log(
    `[action:${action.id}] Processing action ${action.id} with prompt "${action.description}"`,
  );

  // flags for successful execution
  let successfulExecution = false;
  let noToolExecution = true;

  try {
    const conversation = await dbGetConversation({
      conversationId: action.conversationId,
      isServer: true,
    });

    if (!conversation) {
      console.error(
        `[action:${action.id}] Conversation ${action.conversationId} not found`,
      );
      return;
    }

    logWithTiming(startTime, `[action:${action.id}] Retrieved conversation`);

    // Get user wallet
    const activeWallet = action.user.wallets.find((w) => w.active);
    if (!activeWallet) {
      console.error(
        `[action:${action.id}] No active wallet found for user ${action.userId}`,
      );
      return;
    }
    const systemPrompt =
      defaultSystemPrompt +
      `\n\nUser Wallet address: ${activeWallet.publicKey}`;

    // Run messages through orchestration
    const { toolsRequired, usage: orchestratorUsage } =
      await getToolsFromOrchestrator(
        [
          {
            id: '1',
            role: 'user',
            content: action.description,
          },
        ],
        true,
      );
    const agent = await retrieveAgentKitServer({
      userId: action.user.id,
      walletId: activeWallet.id,
    });

    console.log('toolsRequired', toolsRequired);

    logWithTiming(
      startTime,
      `[action:${action.id}] getToolsFromOrchestrator completed`,
    );

    // Check for any unknown tools
    for (const toolName of toolsRequired ?? []) {
      if (toolName.startsWith('INVALID_TOOL:')) {
        console.error(
          `[action:${action.id}] Unknown tool requested ${toolName}, skipping action`,
        );
        successfulExecution = false;
        return;
      }
    }

    const tools = toolsRequired
      ? getToolsFromRequiredTools(toolsRequired)
      : defaultTools;

    const clonedTools = _.cloneDeep(tools);
    for (const toolName in clonedTools) {
      const tool = clonedTools[toolName as keyof typeof clonedTools];
      clonedTools[toolName as keyof typeof clonedTools] = {
        ...tool,
        agentKit: agent.data?.agent,
        userId: action.userId,
      };
    }

    // Remove createAction from tools, prevent recursive action creation
    delete tools.createAction;

    // Call the AI model
    logWithTiming(startTime, `[action:${action.id}] calling generateText`);
    const { response, usage } = await generateText({
      model: defaultModel,
      system: systemPrompt,
      tools: clonedTools as Record<string, CoreTool<any, any>>,
      experimental_telemetry: {
        isEnabled: true,
        functionId: 'generate-text',
      },
      experimental_repairToolCall: async ({
        toolCall,
        tools,
        parameterSchema,
        error,
      }) => {
        if (NoSuchToolError.isInstance(error)) {
          return null;
        }

        console.log('[action:${action.id}] repairToolCall', toolCall);

        const tool = tools[toolCall.toolName as keyof typeof tools];
        const { object: repairedArgs } = await generateObject({
          model: defaultModel,
          schema: tool.parameters as z.ZodType<any>,
          prompt: [
            `The model tried to call the tool "${toolCall.toolName}"` +
              ` with the following arguments:`,
            JSON.stringify(toolCall.args),
            `The tool accepts the following schema:`,
            JSON.stringify(parameterSchema(toolCall)),
            'Please fix the arguments.',
          ].join('\n'),
        });

        console.log('[action:${action.id}] repairedArgs', repairedArgs);
        console.log('[action:${action.id}] toolCall', toolCall);

        return { ...toolCall, args: JSON.stringify(repairedArgs) };
      },
      onStepFinish({ toolResults, stepType }) {
        if (stepType === 'tool-result' && toolResults.length > 0) {
          noToolExecution = false;
        }
      },
      maxSteps: 15,
      prompt: action.description,
    });

    const finalMessages = appendResponseMessages({
      messages: [],
      responseMessages: response.messages.map((m) => {
        return {
          ...m,
          id: uniqueId(),
        };
      }),
    });

    // Increment createdAt by 1ms to avoid duplicate timestamps
    const now = new Date();
    finalMessages.forEach((m, index) => {
      if (m.createdAt) {
        m.createdAt = new Date(m.createdAt.getTime() + index);
      } else {
        m.createdAt = new Date(now.getTime() + index);
      }
    });

    logWithTiming(startTime, `[action:${action.id}] generateText completed`);

    const messages = await dbCreateMessages({
      messages: finalMessages.map((message) => {
        return {
          conversationId: action.conversationId,
          createdAt: message.createdAt,
          role: message.role,
          content: message.content,
          toolInvocations: message.toolInvocations
            ? JSON.parse(JSON.stringify(message.toolInvocations))
            : undefined,
          experimental_attachments: message.experimental_attachments
            ? JSON.parse(JSON.stringify(message.experimental_attachments))
            : undefined,
        };
      }),
    });

    logWithTiming(
      startTime,
      `[action:${action.id}] dbCreateMessages completed`,
    );

    // Save the token stats
    if (messages && isValidTokenUsage(usage)) {
      const messageIds = messages.map((message) => message.id);
      let { promptTokens, completionTokens, totalTokens } = usage;

      // Attach orchestrator usage
      if (isValidTokenUsage(orchestratorUsage)) {
        promptTokens += orchestratorUsage.promptTokens;
        completionTokens += orchestratorUsage.completionTokens;
        totalTokens += orchestratorUsage.totalTokens;
      }

      await dbCreateTokenStat({
        userId: action.userId,
        messageIds,
        promptTokens,
        completionTokens,
        totalTokens,
      });

      logWithTiming(
        startTime,
        `[action:${action.id}] dbCreateTokenStat completed`,
      );
    }

    console.log(`[action:${action.id}] Processed action ${action.id}`);

    // If no tool was executed, mark the action as failure
    if (!noToolExecution) {
      successfulExecution = true;
    }
  } catch (error) {
    console.error(
      `[action:${action.id}] Failed to process action ${action.id}`,
      error,
    );
    successfulExecution = false;
  } finally {
    // Increment the action's execution count and state
    const now = new Date();

    const update = {
      timesExecuted: { increment: 1 },
      lastExecutedAt: now,
      completed:
        !!action.maxExecutions &&
        action.timesExecuted + 1 >= action.maxExecutions,
      lastSuccessAt: successfulExecution ? now : undefined,
      lastFailureAt: !successfulExecution ? now : undefined,
      paused: action.paused,
    };

    if (!successfulExecution && action.lastSuccessAt) {
      // Action failed, but has succeeded before. If lastSuccessAt is more than 1 day ago, pause the action
      const lastSuccessAt = moment(action.lastSuccessAt);
      const oneDayAgo = moment().subtract(1, 'days');

      if (lastSuccessAt.isBefore(oneDayAgo)) {
        update.paused = true;

        console.log(
          `[action:${action.id}] paused - execution failed and no recent success`,
        );

        await dbCreateMessages({
          messages: [
            {
              conversationId: action.conversationId,
              role: 'assistant',
              content: `I've paused action ${action.id} because it has not executed successfully in the last 24 hours.`,
              toolInvocations: [],
              experimental_attachments: [],
            },
          ],
        });
      }
    } else if (!successfulExecution && !action.lastSuccessAt) {
      // Action failed and has never succeeded before. If execution count is more than N, pause the action
      if (action.timesExecuted >= ACTION_PAUSE_THRESHOLD) {
        update.paused = true;

        console.log(
          `[action:${action.id}] paused - execution failed repeatedly`,
        );

        await dbCreateMessages({
          messages: [
            {
              conversationId: action.conversationId,
              role: 'assistant',
              content: `I've paused action ${action.id} because it has failed to execute successfully more than ${ACTION_PAUSE_THRESHOLD} times.`,
              toolInvocations: [],
              experimental_attachments: [],
            },
          ],
        });
      }
    }

    await prisma.action.update({
      where: { id: action.id },
      data: update,
    });
  }
}
