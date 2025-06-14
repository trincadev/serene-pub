export class GroupReplyStrategies {
    static MANUAL = "manual" // User manually selects persona for each reply
    static ORDERED = "ordered" // Replies follow the order of personas in the chat
    static NATURAL = "natural" // Replies are assigned based on natural conversation flow

    static options = [
        [GroupReplyStrategies.ORDERED, "Ordered (Round-robin)"],
        // [GroupReplyStrategies.MANUAL, "Manual (User selects)"],
        // [GroupReplyStrategies.NATURAL, "Natural (Conversation flow)"]
    ]
}