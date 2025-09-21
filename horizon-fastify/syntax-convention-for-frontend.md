# Syntax Convention for Frontend Display

This document outlines the syntax conventions and formatting requirements for AI-generated responses to ensure proper display in the frontend code formatter.

## 1. Code Tag Handling (`<code>`)

### Purpose
The `<code>` tag is used to wrap all code examples and snippets in AI responses.

### Formatting Requirements
- **CRITICAL**: All code within `<code>` tags MUST include proper language-specific indentation
- **CRITICAL**: All code within `<code>` tags MUST include proper line breaks for multiline examples
- Code must be syntactically correct and executable
- Use consistent indentation (2 or 4 spaces, depending on language conventions)

### Examples

#### ✅ Correct Usage
```html
<code>function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}</code>
```

```html
<code>class Solution {
    public int[] twoSum(int[] nums, int target) {
        Map<Integer, Integer> map = new HashMap<>();
        for (int i = 0; i < nums.length; i++) {
            int complement = target - nums[i];
            if (map.containsKey(complement)) {
                return new int[]{map.get(complement), i};
            }
            map.put(nums[i], i);
        }
        return new int[]{};
    }
}</code>
```

```html
<code>def binary_search(arr, target):
    left, right = 0, len(arr) - 1

    while left <= right:
        mid = (left + right) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            left = mid + 1
        else:
            right = mid - 1

    return -1</code>
```

#### ❌ Incorrect Usage
```html
<!-- No indentation -->
<code>function fibonacci(n) {
if (n <= 1) return n;
return fibonacci(n - 1) + fibonacci(n - 2);
}</code>

<!-- Single line when it should be multiline -->
<code>function fibonacci(n) { if (n <= 1) return n; return fibonacci(n - 1) + fibonacci(n - 2); }</code>

<!-- Using backticks instead of code tags -->
`function fibonacci(n) { ... }`
```

### Language-Specific Indentation Rules
- **JavaScript/TypeScript**: 2 spaces
- **Python**: 4 spaces
- **Java/C#**: 4 spaces
- **Go**: Tabs (represented as 4 spaces in display)
- **HTML/CSS**: 2 spaces
- **SQL**: 2 spaces for nested queries

## 2. Concept Highlighting (`<cap>`)

### Purpose
The `<cap>` tag is used to highlight important technical concepts, keywords, and meaningful terms.

### Usage Guidelines
- Wrap single words or short phrases (1-3 words maximum)
- Use for technical terms that are central to the explanation
- Use for concepts the candidate should focus on
- Do NOT overuse - limit to 1-3 per response

### Examples

#### ✅ Correct Usage
```html
Let's explore <cap>recursion</cap> next. How would you implement this using <cap>dynamic programming</cap>?

You need to consider the <cap>time complexity</cap> of your solution.

Think about the <cap>edge cases</cap> when the array is empty.
```

#### ❌ Incorrect Usage
```html
<!-- Too many caps -->
Let's <cap>explore</cap> <cap>recursion</cap> <cap>next</cap>. <cap>How</cap> would you <cap>implement</cap> this?

<!-- Too long phrases -->
<cap>time complexity analysis</cap>

<!-- Non-technical words -->
<cap>Let's</cap> think about this.
```

## 3. Response Structure Guidelines

### Sentence Length
- Default to single sentence responses
- Use 2 sentences only when absolutely necessary for clarity
- Keep sentences short for verbal conversation flow

### Conversation Flow
- End with a concise follow-up question
- Stay strictly within assigned topics
- Maintain interviewer persona consistency

### Decision Logic Examples
1. **If CORRECT**: Single acknowledgment + new question in same topic
   ```
   Great! Let's explore <cap>recursion</cap> next. How would you implement <code>fibonacci(n)</code> using memoization?
   ```

2. **If PARTIALLY CORRECT**: One sentence on what's missing
   ```
   Almost there. You need to handle the <cap>edge case</cap> when the array is empty.
   ```

3. **If INCORRECT**: Single hint or simpler rephrasing
   ```
   Let me rephrase. Think about <cap>time complexity</cap> - how many times does your loop execute?
   ```

## 4. Frontend Implementation Guidelines

### Code Formatter Requirements
- The frontend code formatter must preserve all whitespace within `<code>` tags
- Indentation and line breaks within `<code>` tags should be rendered exactly as provided
- Syntax highlighting should be applied based on detected language

### Parsing Rules
1. Extract content between `<code>` and `</code>` tags
2. Preserve all whitespace characters (spaces, tabs, newlines)
3. Apply syntax highlighting without modifying formatting
4. Ensure monospace font rendering

### CSS Considerations
```css
.code-block {
  white-space: pre;           /* Preserve whitespace and line breaks */
  font-family: 'Fira Code', monospace;
  background-color: #f5f5f5;
  padding: 12px;
  border-radius: 4px;
  overflow-x: auto;
}

.concept-highlight {
  background-color: #e3f2fd;
  padding: 2px 4px;
  border-radius: 3px;
  font-weight: 500;
}
```

## 5. Quality Assurance Checklist

Before displaying AI responses, verify:

### Code Formatting
- [ ] All code examples use `<code>` tags (never backticks)
- [ ] Code has proper indentation for the language
- [ ] Multiline code has appropriate line breaks
- [ ] Code is syntactically correct
- [ ] Indentation is consistent throughout the example

### Concept Highlighting
- [ ] Important concepts are wrapped with `<cap>` tags
- [ ] No more than 3 `<cap>` tags per response
- [ ] Highlighted terms are genuinely important
- [ ] Phrases in `<cap>` tags are 3 words or fewer

### Response Quality
- [ ] Response length is appropriate (1-2 sentences)
- [ ] Ends with a relevant follow-up question
- [ ] Maintains topic focus
- [ ] Uses conversational tone

## 6. Common Pitfalls to Avoid

1. **Mixed formatting**: Never mix backticks with `<code>` tags
2. **Inconsistent indentation**: Ensure all lines in a code block use the same indentation style
3. **Over-highlighting**: Don't wrap every technical word in `<cap>` tags
4. **Malformed tags**: Ensure all tags are properly closed
5. **Compressed code**: Don't put multiline code on a single line
6. **Language mixing**: Don't mix different programming languages in one `<code>` block

## 7. Testing Scenarios

### Test Cases for Code Formatting
1. Single-line code snippets
2. Multi-line functions with nested structures
3. Class definitions with methods
4. SQL queries with subqueries
5. JSON/XML with nested structures

### Test Cases for Concept Highlighting
1. Responses with 0 `<cap>` tags
2. Responses with 1-3 `<cap>` tags
3. Technical terms vs. common words
4. Single words vs. short phrases

This convention ensures consistent, properly formatted responses that enhance the learning experience and maintain technical accuracy in the interview simulation.