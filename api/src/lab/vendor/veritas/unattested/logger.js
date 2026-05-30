export class InMemoryLogger {
    entries = [];
    async log(entry) {
        this.entries.push(entry);
    }
}
