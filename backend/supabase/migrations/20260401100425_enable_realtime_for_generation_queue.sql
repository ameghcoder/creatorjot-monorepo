-- Enabling the Realtime for Generation_Queue table to send the server events on frontend after generation completion

ALTER PUBLICATION supabase_realtime ADD TABLE generation_queue;