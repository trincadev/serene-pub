UPDATE context_configs
SET template = '
{{#systemBlock}}
Instructions:
"""
{{instructions}}
"""

Assistant Characters (AI-controlled):
```json
{{{characters}}}
```

User Characters (player-controlled):
```json
{{{personas}}}
```

Scenario:
"""
{{scenario}}
"""
{{/systemBlock}}

{{#if wiBefore}}
{{#systemBlock}}
{{wiBefore}}
{{/systemBlock}}
{{/if}}

{{#each chatMessages}}
  {{#if (eq role "assistant")}}
{{#assistantBlock}}
{{name}}: {{{message}}}
{{/assistantBlock}}
  {{/if}}

  {{#if (eq role "user")}}
{{#userBlock}}
{{name}}: {{{message}}}
{{/userBlock}}
  {{/if}}
{{/each}}

{{#if wiAfter}}
{{#systemBlock}}
{{wiAfter}}
{{/systemBlock}}
{{/if}}
'
WHERE id = 1;