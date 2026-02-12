export const ROLES = {
    OPERATOR: 'operator',
    ADMIN: 'admin'
};

export const ACTIONS = {
    READ: 'READ',           // list, inspect, logs, stats
    OPERATE: 'OPERATE',     // start, stop, restart, pause, unpause, exec
    DESTRUCTIVE: 'DESTRUCTIVE' // remove
};

const PERMISSIONS = {
    [ROLES.OPERATOR]: {
        [ACTIONS.READ]: (owns) => owns,        // Can read only own resources
        [ACTIONS.OPERATE]: (owns) => owns,     // Can operate only own resources
        [ACTIONS.DESTRUCTIVE]: (owns) => owns  // Can remove only own resources
    },
    [ROLES.ADMIN]: {
        [ACTIONS.READ]: () => true,            // Can read any
        [ACTIONS.OPERATE]: () => true,         // Can operate any
        [ACTIONS.DESTRUCTIVE]: () => true      // Can destroy any
    }
};

// Central Permission Resolver

export const canPerform = ({ role, ownsResource, actionType }) => {
    if (!role || !actionType) return false;

    const rolePermissions = PERMISSIONS[role];
    if (!rolePermissions) return false;

    const actionCheck = rolePermissions[actionType];
    if (!actionCheck) return false;

    return actionCheck(ownsResource);
};
