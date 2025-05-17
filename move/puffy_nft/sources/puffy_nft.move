// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

module puffy_nft::puffy_nft;

use sui::coin::{Self, Coin};
use sui::event;
use sui::sui::SUI;
use sui::url::{Self, Url};

// Card Types
const MINI_PUFF_TYPE: u8 = 1;
const MEGA_PUFF_TYPE: u8 = 2;
const WALE_PUFF_TYPE: u8 = 3;

// Card Prices (in MIST)
const MINI_PUFF_PRICE: u64 = 100_000_000; // 0.1 SUI
const MEGA_PUFF_PRICE: u64 = 250_000_000; // 0.25 SUI
const WALE_PUFF_PRICE: u64 = 500_000_000; // 0.5 SUI

// Card Clicks
const MINI_PUFF_CLICKS: u64 = 1000;
const MEGA_PUFF_CLICKS: u64 = 3000;
const WALE_PUFF_CLICKS: u64 = 7500;

// Error Codes
const E_INSUFFICIENT_FUNDS: u64 = 1;
const E_INVALID_CARD_TYPE: u64 = 2;
const E_PAYMENT_EMPTY: u64 = 3;

// Treasury Address
const TREASURY_ADDRESS: address =
    @0x083c45c738d6a07a6cfc940e0bde7fe530ba094e8c9c56ee584774f0decee723;

// NFT Struct
public struct PuffyNFT has key, store {
    id: UID,
    card_type: u8,
    clicks: u64,
    url: Url,
}

// Event for Minting
public struct MintEvent has copy, drop {
    buyer: address,
    card_type: u8,
    clicks: u64,
    object_id: ID,
}

// Mint NFT Function
public entry fun mint_nft(card_type: u8, mut payment: Coin<SUI>, ctx: &mut TxContext) {
    let buyer = tx_context::sender(ctx);
    let price = get_price(card_type);
    let clicks = get_clicks(card_type);

    assert!(coin::value(&payment) > 0, E_PAYMENT_EMPTY);
    assert!(coin::value(&payment) >= price, E_INSUFFICIENT_FUNDS);

    let treasury_payment = coin::split(&mut payment, price, ctx);
    transfer::public_transfer(treasury_payment, TREASURY_ADDRESS);

    if (coin::value(&payment) > 0) {
        transfer::public_transfer(payment, buyer);
    } else {
        coin::destroy_zero(payment);
    };

    let nft = PuffyNFT {
        id: object::new(ctx),
        card_type,
        clicks,
        url: url::new_unsafe_from_bytes(b"https://puffy.example.com/nft.png"),
    };
    let nft_id = object::id(&nft);

    transfer::public_transfer(nft, buyer);

    event::emit(MintEvent {
        buyer,
        card_type,
        clicks,
        object_id: nft_id,
    });
}

// Helper Functions
fun get_price(card_type: u8): u64 {
    if (card_type == MINI_PUFF_TYPE) { MINI_PUFF_PRICE } else if (card_type == MEGA_PUFF_TYPE) {
        MEGA_PUFF_PRICE
    } else if (card_type == WALE_PUFF_TYPE) { WALE_PUFF_PRICE } else { abort E_INVALID_CARD_TYPE }
}

fun get_clicks(card_type: u8): u64 {
    if (card_type == MINI_PUFF_TYPE) { MINI_PUFF_CLICKS } else if (card_type == MEGA_PUFF_TYPE) {
        MEGA_PUFF_CLICKS
    } else if (card_type == WALE_PUFF_TYPE) { WALE_PUFF_CLICKS } else { abort E_INVALID_CARD_TYPE }
}
