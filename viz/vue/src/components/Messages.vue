<template>
    <div>
        <h4 class="pb-5">Messages</h4>
        <pre style="max-height: 70vh; overflow-y: scroll; white-space: pre-wrap; word-break: keep-all;">{{ messages.slice(0, 100).map(m => `${m.timestamp} ${m.topic.string}: ${JSON.stringify(m.message)}`).join('\n\n') }}</pre>
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

            }
        },
        computed: {

        }
    }
</script>
