"""insyght-ai-worker: the one Python worker for AI and resume work (ADR-0001, IATS-151).

It replaces resume-parser-worker, embedding-worker and ai-artifact-worker. Each former worker
is now a handler with the same topic and consumer group. Every model call goes through
`gateway.AiGateway`.
"""
