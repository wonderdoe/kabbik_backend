

module.exports = {
    millisecondsUntilEndOfDay: () => {
        // Get the current date and time
        const now = new Date();

        // Create a new date object for today's 23:59:59
        const endOfDay = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
            23, 59, 59, 999
        );

        // Calculate the difference in milliseconds
        return endOfDay - now;
    }
}