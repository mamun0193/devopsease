import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { containerActionsApi } from '../api/containerActions';
import type { ContainerActionResponse } from '../api/containerActions';

// Action types supported by the system
export type ContainerAction = 'start' | 'stop' | 'restart' | 'remove';

// Per-container action state
interface ActionState {
  loading: boolean;
  error: string | null;
  success: string | null;
  lastAction: ContainerAction | null;
}

// Overall slice state
interface ContainersState {
  // Track action state per container ID
  actionStates: Record<string, ActionState>;
  // Last completed action for toast notifications
  lastCompletedAction: {
    containerId: string;
    containerName: string;
    action: ContainerAction;
    success: boolean;
    message: string;
  } | null;
}

const initialState: ContainersState = {
  actionStates: {},
  lastCompletedAction: null,
};

// Default state for a container with no pending actions
const defaultActionState: ActionState = {
  loading: false,
  error: null,
  success: null,
  lastAction: null,
};


export const startContainer = createAsyncThunk<
  ContainerActionResponse,
  { containerId: string; containerName: string },
  { rejectValue: string }
>(
  'containers/start',
  async ({ containerId }, { rejectWithValue }) => {
    try {
      return await containerActionsApi.start(containerId);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      return rejectWithValue(err.response?.data?.message || err.message || 'Failed to start container');
    }
  }
);

export const stopContainer = createAsyncThunk<
  ContainerActionResponse,
  { containerId: string; containerName: string },
  { rejectValue: string }
>(
  'containers/stop',
  async ({ containerId }, { rejectWithValue }) => {
    try {
      return await containerActionsApi.stop(containerId);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      return rejectWithValue(err.response?.data?.message || err.message || 'Failed to stop container');
    }
  }
);

export const restartContainer = createAsyncThunk<
  ContainerActionResponse,
  { containerId: string; containerName: string },
  { rejectValue: string }
>(
  'containers/restart',
  async ({ containerId }, { rejectWithValue }) => {
    try {
      return await containerActionsApi.restart(containerId);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      return rejectWithValue(err.response?.data?.message || err.message || 'Failed to restart container');
    }
  }
);

export const removeContainer = createAsyncThunk<
  ContainerActionResponse,
  { containerId: string; containerName: string; force?: boolean },
  { rejectValue: string }
>(
  'containers/remove',
  async ({ containerId, force = false }, { rejectWithValue }) => {
    try {
      return await containerActionsApi.remove(containerId, force);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      return rejectWithValue(err.response?.data?.message || err.message || 'Failed to remove container');
    }
  }
);

const containersSlice = createSlice({
  name: 'containers',
  initialState,
  reducers: {
    // Clear action state for a specific container
    clearActionState: (state, action: PayloadAction<string>) => {
      const containerId = action.payload;
      state.actionStates[containerId] = defaultActionState;
    },
    // Clear the last completed action (used after toast is shown)
    clearLastCompletedAction: (state) => {
      state.lastCompletedAction = null;
    },
    // Clear all action states (used on page unmount)
    clearAllActionStates: (state) => {
      state.actionStates = {};
      state.lastCompletedAction = null;
    },
  },
  extraReducers: (builder) => {
    // Helper to handle pending state
    const handlePending = (state: ContainersState, containerId: string, action: ContainerAction) => {
      state.actionStates[containerId] = {
        loading: true,
        error: null,
        success: null,
        lastAction: action,
      };
    };

    // Helper to handle fulfilled state
    const handleFulfilled = (
      state: ContainersState,
      containerId: string,
      containerName: string,
      action: ContainerAction,
      message: string
    ) => {
      state.actionStates[containerId] = {
        loading: false,
        error: null,
        success: message,
        lastAction: action,
      };
      state.lastCompletedAction = {
        containerId,
        containerName,
        action,
        success: true,
        message,
      };
    };

    // Helper to handle rejected state
    const handleRejected = (
      state: ContainersState,
      containerId: string,
      containerName: string,
      action: ContainerAction,
      message: string
    ) => {
      state.actionStates[containerId] = {
        loading: false,
        error: message,
        success: null,
        lastAction: action,
      };
      state.lastCompletedAction = {
        containerId,
        containerName,
        action,
        success: false,
        message,
      };
    };

    // Start container
    builder
      .addCase(startContainer.pending, (state, action) => {
        handlePending(state, action.meta.arg.containerId, 'start');
      })
      .addCase(startContainer.fulfilled, (state, action) => {
        handleFulfilled(
          state,
          action.meta.arg.containerId,
          action.meta.arg.containerName,
          'start',
          action.payload.message
        );
      })
      .addCase(startContainer.rejected, (state, action) => {
        handleRejected(
          state,
          action.meta.arg.containerId,
          action.meta.arg.containerName,
          'start',
          action.payload || 'Failed to start container'
        );
      });

    // Stop container
    builder
      .addCase(stopContainer.pending, (state, action) => {
        handlePending(state, action.meta.arg.containerId, 'stop');
      })
      .addCase(stopContainer.fulfilled, (state, action) => {
        handleFulfilled(
          state,
          action.meta.arg.containerId,
          action.meta.arg.containerName,
          'stop',
          action.payload.message
        );
      })
      .addCase(stopContainer.rejected, (state, action) => {
        handleRejected(
          state,
          action.meta.arg.containerId,
          action.meta.arg.containerName,
          'stop',
          action.payload || 'Failed to stop container'
        );
      });

    // Restart container
    builder
      .addCase(restartContainer.pending, (state, action) => {
        handlePending(state, action.meta.arg.containerId, 'restart');
      })
      .addCase(restartContainer.fulfilled, (state, action) => {
        handleFulfilled(
          state,
          action.meta.arg.containerId,
          action.meta.arg.containerName,
          'restart',
          action.payload.message
        );
      })
      .addCase(restartContainer.rejected, (state, action) => {
        handleRejected(
          state,
          action.meta.arg.containerId,
          action.meta.arg.containerName,
          'restart',
          action.payload || 'Failed to restart container'
        );
      });

    // Remove container
    builder
      .addCase(removeContainer.pending, (state, action) => {
        handlePending(state, action.meta.arg.containerId, 'remove');
      })
      .addCase(removeContainer.fulfilled, (state, action) => {
        handleFulfilled(
          state,
          action.meta.arg.containerId,
          action.meta.arg.containerName,
          'remove',
          action.payload.message
        );
      })
      .addCase(removeContainer.rejected, (state, action) => {
        handleRejected(
          state,
          action.meta.arg.containerId,
          action.meta.arg.containerName,
          'remove',
          action.payload || 'Failed to remove container'
        );
      });
  },
});

export const { clearActionState, clearLastCompletedAction, clearAllActionStates } = containersSlice.actions;
export default containersSlice.reducer;
