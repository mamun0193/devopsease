
import inquirer from 'inquirer';

/**
 * Standardized generic interactive resource picker.
 * @param {Array} items - List of items to choose from
 * @param {Function} labelFn - Function that takes an item and returns a string label
 * @param {Object} opts - Options object (message, name)
 * @returns {Promise<any>} The selected item's raw object or value
 */
export async function selectResource(items, labelFn, opts = {}) {
    if (!items || items.length === 0) {
        throw new Error('No items available for selection.');
    }

    const message = opts.message || 'Select an item:';
    const name = opts.name || 'selectedId';

    const choices = items.map((item) => ({
        name: labelFn(item),
        value: item._id || item.id || item,
    }));

    try {
        const answers = await inquirer.prompt([
            {
                type: 'list',
                name,
                message,
                choices,
            },
        ]);
        return answers[name];
    } catch (error) {
        if (error.isTtyError || error.message.includes('closed') || error.message.includes('User force closed')) {
            process.exit(0);
        }
        throw error;
    }
}

/**
 * Standardized destructive action confirmation.
 * @param {string} message - The confirmation message
 * @param {boolean} defaultVal - Default answer (usually false for destructive actions)
 * @returns {Promise<boolean>} True if confirmed
 */
export async function confirmAction(message, defaultVal = false) {
    try {
        const answers = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'confirm',
                message,
                default: defaultVal,
            },
        ]);
        return answers.confirm;
    } catch (error) {
        if (error.isTtyError || error.message.includes('closed') || error.message.includes('User force closed')) {
            process.exit(0);
        }
        throw error;
    }
}
