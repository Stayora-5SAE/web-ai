# Demo data and stock photography

The development seed is synthetic. Property names, descriptions, people, reviews and conversations are fictional. Stock photographs illustrate the demo and are not evidence of an actual Tunisian rental or its facilities.

`DevSeeder` runs the original fixtures plus `dev-demo-seed.sql` inside one transaction under the `dev` profile. Stable UUIDs and `ON CONFLICT DO NOTHING` preserve records and first-insert dates on rerun. No credentials are created. Only the original eight seed listings still using `lh3.googleusercontent.com/aida-public/` photo sets receive replacement images; custom image URLs are preserved. Property rating/count caches are recalculated from actual stay reviews.

The expanded set adds 16 accounts, 20 properties (18 published, one draft and one archived), 68 reservations (54 completed, 12 upcoming, one cancelled and one declined), 50 stay reviews, 36 guest reviews, 12 conversations/24 messages, six wishlist entries, eight owner blocks and 36 nightly-price overrides. All payments remain simulated; guest reviews have no tags, and four completed stays remain open for stay reviews.

Dates are relative to the database date at first insertion. Re-running does not move existing bookings. Reviews follow the reservation date and ownership contracts. The seed namespaces are `01`/`02` (accounts), `11` (properties), `21`/`22`/`23` (reservations), `31`/`32` (availability), `41` (wishlists), `51`/`52` (reviews), `61` (conversations) and `71`/`72` (messages).

## Photo sources

Images are referenced directly from the Pexels CDN with bounded 1200 px delivery; they are not copied into the repository. Source pages identify the photographers and link their current [Pexels license](https://www.pexels.com/license/). Some images are from other countries and serve only as illustrative demo photography.

| Photo                          | Source                                                                                                         |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| Traditional Tunisian courtyard | [Pexels 36156108](https://www.pexels.com/photo/stunning-interior-of-traditional-tunisian-courtyard-36156108/)  |
| Mediterranean villa with pool  | [Pexels 24807128](https://www.pexels.com/photo/luxury-house-with-pool-24807128/)                               |
| Arabic courtyard with pool     | [Pexels 8484841](https://www.pexels.com/photo/luxurious-pool-in-courtyard-of-arabic-house-8484841/)            |
| Sea-view holiday villa         | [Pexels 19075385](https://www.pexels.com/photo/swimming-pool-of-a-holiday-home-overlookig-the-sea-19075385/)   |
| Mediterranean pool at sunset   | [Pexels 31751031](https://www.pexels.com/photo/mediterranean-architecture-with-pool-at-sunset-31751031/)       |
| Apartment living room          | [Pexels 6312353](https://www.pexels.com/photo/cozy-living-room-in-modern-apartment-6312353/)                   |
| Warm living room               | [Pexels 19199957](https://www.pexels.com/photo/living-room-in-apartment-19199957/)                             |
| Coastal Mediterranean villa    | [Pexels 38326661](https://www.pexels.com/photo/stunning-spanish-villa-overlooking-mediterranean-sea-38326661/) |
| Mediterranean villas at dusk   | [Pexels 34653830](https://www.pexels.com/photo/charming-mediterranean-villas-overlooking-pool-34653830/)       |
| Living room with fireplace     | [Pexels 12998902](https://www.pexels.com/photo/a-cozy-living-room-with-fireplace-12998902/)                    |
| Loft living room               | [Pexels 5824531](https://www.pexels.com/photo/cozy-room-with-brick-wall-and-vintage-furniture-5824531/)        |
| Kitchen interior               | [Pexels 6264406](https://www.pexels.com/photo/kitchen-interior-with-marble-top-counter-6264406/)               |
| Bedroom interior               | [Pexels 12700517](https://www.pexels.com/photo/a-bedroom-interior-12700517/)                                   |
| Bedroom                        | [Pexels 1454806](https://www.pexels.com/photo/photo-of-bedroom-1454806/)                                       |
| Kitchen and dining area        | [Pexels 1080721](https://www.pexels.com/photo/kitchen-and-dining-area-1080721/)                                |
| Pool among trees               | [Pexels 2227774](https://www.pexels.com/photo/swimming-pool-surrounded-trees-2227774/)                         |
