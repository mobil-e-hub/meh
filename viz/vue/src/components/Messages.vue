<template>
    <div>
        <h4 >Messages</h4>
        <div class="pb-5">
            <label class="pr-2"> Filter by:   </label>
            <input v-model="query" placeholder="query">
        </div>
        <pre style="max-height: 70vh; overflow-y: scroll; white-space: pre-wrap; word-break: keep-all;">{{ filteredMessages.join('\n\n') }}</pre>
    </div>
</template>

<script>
    export default {
        name: 'Messages',
        props: {
            messages: Array
        },
        data: function () {
            return {
                query: ""
            }
        },
        computed: {
            filteredMessages() {
                return this.messages.slice(0, 100).map(m => `${m.timestamp.toString()} ${m.topic.string.short}: ${JSON.stringify(m.message)}`).filter( str =>  str.includes(this.query));
            },
        }
    }
</script>
