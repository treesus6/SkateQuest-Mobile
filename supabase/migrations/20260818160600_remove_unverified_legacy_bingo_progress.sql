-- Legacy Trick Bingo cards were completed by tapping squares on the client.
-- They had no video proof or judging, so they must not appear as verified progress.
-- New verified cards use card_data.week_start rather than the old week_number marker.

delete from public.bingo_cards
where card_data ? 'week_number'
  and not (card_data ? 'week_start');
