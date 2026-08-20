export function createChibiCharacter(scene, {
    x = 0,
    y = 0,
    character = 'boy',
    nickname = '',
    showName = true,
}) {
    // ─────────────────────────────────────────────
    // CHARACTER TYPES
    // boy        = blue casual boy
    // girl       = pink casual girl
    // schoolBoy  = school uniform boy
    // schoolGirl = school uniform girl
    // ─────────────────────────────────────────────

    const isCasualBoy = character === 'boy';
    const isCasualGirl = character === 'girl';
    const isSchoolBoy = character === 'schoolBoy';
    const isSchoolGirl = character === 'schoolGirl';

    const isGirl = isCasualGirl || isSchoolGirl;
    const isSchool = isSchoolBoy || isSchoolGirl;

    // ─────────────────────────────────────────────
    // COMMON COLORS
    // ─────────────────────────────────────────────

    const skin = 0xf5c18d;
    const skinBorder = 0xc97c4b;

    const hair = isGirl
        ? 0x33231b
        : 0x2b211c;

    const hairBorder = 0x1b120e;

    // Casual character colours
    const casualColors = isGirl
        ? {
            shirt: 0xec4899,
            shirtBorder: 0x9d174d,

            trousers: 0x7c3aed,

            shoes: 0x4c1d95,

            backpack: 0xa855f7,
            backpackBorder: 0x6b21a8,
        }
        : {
            shirt: 0x38bdf8,
            shirtBorder: 0x075985,

            trousers: 0x334155,

            shoes: 0x111827,

            backpack: 0xf97316,
            backpackBorder: 0x9a3412,
        };

    // School colours
    const schoolColors = {
        shirt: 0xffffff,
        shirtBorder: 0xb8c4d1,

        uniformBlue: 0x172554,
        uniformBlueDark: 0x0f172a,

        shoes: 0x171717,
        shoesBorder: 0x050505,

        socks: 0xffffff,
        socksBorder: 0xd1d5db,
    };

    // ─────────────────────────────────────────────
    // MAIN CONTAINER
    // ─────────────────────────────────────────────

    const playerGraphic = scene.add.container(x, y);

    // ─────────────────────────────────────────────
    // SHADOW
    // ─────────────────────────────────────────────

    const playerShadow = scene.add.ellipse(
        0,
        isSchool ? 30 : 25,
        isSchool ? 30 : 24,
        isSchool ? 8 : 9,
        0x000000,
        0.18
    );

    // Variables shared by all character types
    let legL;
    let legR;

    let sockL = null;
    let sockR = null;

    let shoeL;
    let shoeR;

    let bodyPart;

    let sleeveL = null;
    let sleeveR = null;

    let armL;
    let armR;

    let handL = null;
    let handR = null;

    let bottomPart = null;

    let strapL = null;
    let strapR = null;

    let shortsLine = null;

    let collarL = null;
    let collarR = null;

    let shirtDetail;
    let shirtButton2 = null;

    let backpack = null;

    // ─────────────────────────────────────────────
    // CASUAL BOY / GIRL
    // ─────────────────────────────────────────────

    if (!isSchool) {
        // Legs
        legL = scene.add.rectangle(
            -5,
            17,
            7,
            11,
            casualColors.trousers
        );

        legR = scene.add.rectangle(
            5,
            17,
            7,
            11,
            casualColors.trousers
        );

        legL.setOrigin(0.5);
        legR.setOrigin(0.5);

        // Shoes
        shoeL = scene.add.ellipse(
            -5,
            23,
            9,
            5,
            casualColors.shoes
        );

        shoeR = scene.add.ellipse(
            5,
            23,
            9,
            5,
            casualColors.shoes
        );

        // Shirt
        bodyPart = scene.add.rectangle(
            0,
            4,
            22,
            23,
            casualColors.shirt
        );

        bodyPart.setStrokeStyle(
            2,
            casualColors.shirtBorder
        );

        // White shirt symbol
        shirtDetail = scene.add.circle(
            0,
            5,
            3,
            0xffffff
        );

        // Arms
        armL = scene.add.rectangle(
            -14,
            4,
            7,
            18,
            skin
        );

        armR = scene.add.rectangle(
            14,
            4,
            7,
            18,
            skin
        );

        armL.setStrokeStyle(
            1.5,
            skinBorder
        );

        armR.setStrokeStyle(
            1.5,
            skinBorder
        );

        // Backpack
        backpack = scene.add.rectangle(
            -11,
            3,
            7,
            15,
            casualColors.backpack
        );

        backpack.setStrokeStyle(
            1.5,
            casualColors.backpackBorder
        );

        backpack.setDepth(-1);
    }

    // ─────────────────────────────────────────────
    // SCHOOL BOY / GIRL
    // ─────────────────────────────────────────────

    if (isSchool) {
        // Legs
        legL = scene.add.rectangle(
            -6,
            18,
            7,
            10,
            skin
        );

        legR = scene.add.rectangle(
            6,
            18,
            7,
            10,
            skin
        );

        // Socks
        sockL = scene.add.rectangle(
            -6,
            21,
            7,
            2.5,
            schoolColors.socks
        );

        sockR = scene.add.rectangle(
            6,
            21,
            7,
            2.5,
            schoolColors.socks
        );

        sockL.setStrokeStyle(
            0.4,
            schoolColors.socksBorder
        );

        sockR.setStrokeStyle(
            0.4,
            schoolColors.socksBorder
        );

        // Shoes
        shoeL = scene.add.ellipse(
            -6,
            25.5,
            12,
            7,
            schoolColors.shoes
        );

        shoeR = scene.add.ellipse(
            6,
            25.5,
            12,
            7,
            schoolColors.shoes
        );

        shoeL.setStrokeStyle(
            1,
            schoolColors.shoesBorder
        );

        shoeR.setStrokeStyle(
            1,
            schoolColors.shoesBorder
        );

        // White school shirt
        bodyPart = scene.add.rectangle(
            0,
            3,
            24,
            23,
            schoolColors.shirt
        );

        bodyPart.setStrokeStyle(
            1.5,
            schoolColors.shirtBorder
        );

        // Sleeves
        sleeveL = scene.add.rectangle(
            -13,
            -1,
            7,
            8,
            schoolColors.shirt
        );

        sleeveR = scene.add.rectangle(
            13,
            -1,
            7,
            8,
            schoolColors.shirt
        );

        sleeveL.setStrokeStyle(
            1,
            schoolColors.shirtBorder
        );

        sleeveR.setStrokeStyle(
            1,
            schoolColors.shirtBorder
        );

        // Arms
        armL = scene.add.rectangle(
            -13,
            6,
            5.5,
            8,
            skin
        );

        armR = scene.add.rectangle(
            13,
            6,
            5.5,
            8,
            skin
        );

        armL.setStrokeStyle(
            1,
            skinBorder
        );

        armR.setStrokeStyle(
            1,
            skinBorder
        );

        // Hands
        handL = scene.add.circle(
            -13,
            10,
            2.8,
            skin
        );

        handR = scene.add.circle(
            13,
            10,
            2.8,
            skin
        );

        handL.setStrokeStyle(
            0.8,
            skinBorder
        );

        handR.setStrokeStyle(
            0.8,
            skinBorder
        );

        // Collar
        collarL = scene.add.triangle(
            -5,
            -5,
            0,
            0,
            7,
            0,
            3.5,
            6,
            0xe2e8f0
        );

        collarR = scene.add.triangle(
            5,
            -5,
            0,
            0,
            -7,
            0,
            -3.5,
            6,
            0xe2e8f0
        );

        // Shirt buttons
        shirtDetail = scene.add.circle(
            0,
            4,
            1.2,
            0x64748b
        );

        shirtButton2 = scene.add.circle(
            0,
            9,
            1.2,
            0x64748b
        );

        // ─────────────────────────────────────────
        // SCHOOL GIRL
        // ─────────────────────────────────────────

        if (isSchoolGirl) {
            bottomPart = scene.add.rectangle(
                0,
                14,
                22,
                18,
                schoolColors.uniformBlue
            );

            bottomPart.setStrokeStyle(
                1.4,
                schoolColors.uniformBlueDark
            );

            // Pinafore straps
            strapL = scene.add.rectangle(
                -6,
                2,
                3.5,
                15,
                schoolColors.uniformBlue
            );

            strapR = scene.add.rectangle(
                6,
                2,
                3.5,
                15,
                schoolColors.uniformBlue
            );

            strapL.setStrokeStyle(
                0.8,
                schoolColors.uniformBlueDark
            );

            strapR.setStrokeStyle(
                0.8,
                schoolColors.uniformBlueDark
            );
        }

        // ─────────────────────────────────────────
        // SCHOOL BOY
        // ─────────────────────────────────────────

        if (isSchoolBoy) {
            bottomPart = scene.add.rectangle(
                0,
                15,
                22,
                11,
                schoolColors.uniformBlue
            );

            bottomPart.setStrokeStyle(
                1.4,
                schoolColors.uniformBlueDark
            );

            shortsLine = scene.add.rectangle(
                0,
                18,
                1.3,
                7,
                schoolColors.uniformBlueDark
            );
        }
    }

    // ─────────────────────────────────────────────
    // HAIR
    // ─────────────────────────────────────────────

    let hairBack;
    let hairFront;

    let girlHairLeft = null;
    let girlHairRight = null;

    let hairBow = null;

    // ─────────────────────────────────────────────
    // GIRL HAIR
    // ─────────────────────────────────────────────

    if (isGirl) {
        if (isSchoolGirl) {
            hairBack = scene.add.ellipse(
                0,
                -18,
                27,
                28,
                hair
            );

            girlHairLeft = scene.add.ellipse(
                -9.5,
                -8,
                7,
                21,
                hair
            );

            girlHairRight = scene.add.ellipse(
                9.5,
                -8,
                7,
                21,
                hair
            );

            hairFront = scene.add.arc(
                0,
                -23,
                12.5,
                195,
                345,
                false,
                hair
            );

            hairBack.setStrokeStyle(
                1.6,
                hairBorder
            );

            girlHairLeft.setStrokeStyle(
                1.2,
                hairBorder
            );

            girlHairRight.setStrokeStyle(
                1.2,
                hairBorder
            );

            hairFront.setStrokeStyle(
                0.8,
                hairBorder
            );

            // School girl hair clip
            hairBow = scene.add.rectangle(
                9,
                -25,
                4,
                1.8,
                0xec4899
            );

            hairBow.setRotation(-0.25);
        } else {
            // Casual girl
            hairBack = scene.add.circle(
                0,
                -14,
                13,
                0x4a2c1b
            );

            hairBack.setStrokeStyle(
                2,
                0x2d160c
            );

            girlHairLeft = scene.add.ellipse(
                -10,
                -7,
                8,
                21,
                0x4a2c1b
            );

            girlHairRight = scene.add.ellipse(
                10,
                -7,
                8,
                21,
                0x4a2c1b
            );

            girlHairLeft.setStrokeStyle(
                1.5,
                0x2d160c
            );

            girlHairRight.setStrokeStyle(
                1.5,
                0x2d160c
            );

            hairFront = scene.add.arc(
                0,
                -17,
                10,
                195,
                345,
                false,
                0x4a2c1b
            );

            // Ribbon
            hairBow = scene.add.text(
                8,
                -25,
                '🎀',
                {
                    fontSize: '9px',
                }
            );

            hairBow.setOrigin(0.5);
        }
    }

    // ─────────────────────────────────────────────
    // BOY HAIR
    // ─────────────────────────────────────────────

    if (!isGirl) {
        if (isSchoolBoy) {
            hairBack = scene.add.ellipse(
                0,
                -20,
                26,
                19,
                hair
            );

            hairBack.setStrokeStyle(
                1.6,
                hairBorder
            );

            hairFront = scene.add.arc(
                0,
                -23,
                12.5,
                200,
                340,
                false,
                hair
            );

            hairFront.setStrokeStyle(
                0.8,
                hairBorder
            );
        } else {
            // Casual boy
            hairBack = scene.add.circle(
                0,
                -14,
                13,
                0x5b321f
            );

            hairBack.setStrokeStyle(
                2,
                0x2f1b12
            );

            hairFront = scene.add.arc(
                0,
                -17,
                10,
                195,
                345,
                false,
                0x5b321f
            );
        }
    }

    // ─────────────────────────────────────────────
    // FACE
    // ─────────────────────────────────────────────

    let headPart;

    if (isSchool) {
        headPart = scene.add.ellipse(
            0,
            -17,
            24,
            27,
            skin
        );

        headPart.setStrokeStyle(
            1.5,
            skinBorder
        );
    } else {
        headPart = scene.add.circle(
            0,
            -12,
            11,
            0xf6c28b
        );

        headPart.setStrokeStyle(
            1.8,
            skinBorder
        );
    }

    // ─────────────────────────────────────────────
    // EYES
    // ─────────────────────────────────────────────

    let eyeL;
    let eyeR;

    let eyeHighlightL;
    let eyeHighlightR;

    let eyeSmallHighlightL = null;
    let eyeSmallHighlightR = null;

    if (isSchool) {
        eyeL = scene.add.ellipse(
            -4.5,
            -18,
            4.5,
            5.5,
            0x172033
        );

        eyeR = scene.add.ellipse(
            4.5,
            -18,
            4.5,
            5.5,
            0x172033
        );

        eyeHighlightL = scene.add.circle(
            -3.8,
            -19,
            0.9,
            0xffffff
        );

        eyeHighlightR = scene.add.circle(
            5.2,
            -19,
            0.9,
            0xffffff
        );

        eyeSmallHighlightL = scene.add.circle(
            -5.1,
            -16.5,
            0.45,
            0xffffff
        );

        eyeSmallHighlightR = scene.add.circle(
            3.9,
            -16.5,
            0.45,
            0xffffff
        );
    } else {
        eyeL = scene.add.circle(
            -4,
            -13,
            2.1,
            0x1e293b
        );

        eyeR = scene.add.circle(
            4,
            -13,
            2.1,
            0x1e293b
        );

        eyeHighlightL = scene.add.circle(
            -3.4,
            -13.7,
            0.7,
            0xffffff
        );

        eyeHighlightR = scene.add.circle(
            4.6,
            -13.7,
            0.7,
            0xffffff
        );
    }

    // ─────────────────────────────────────────────
    // BLUSH
    // ─────────────────────────────────────────────

    const blushL = scene.add.ellipse(
        -7,
        isSchool ? -12.5 : -9,
        4,
        isSchool ? 1.8 : 2,
        0xfb7185,
        isSchool ? 0.35 : 0.6
    );

    const blushR = scene.add.ellipse(
        7,
        isSchool ? -12.5 : -9,
        4,
        isSchool ? 1.8 : 2,
        0xfb7185,
        isSchool ? 0.35 : 0.6
    );

    // ─────────────────────────────────────────────
    // NOSE
    // ─────────────────────────────────────────────

    let nose = null;

    if (isSchool) {
        nose = scene.add.circle(
            0,
            -14,
            0.7,
            0xd89463
        );
    }

    // ─────────────────────────────────────────────
    // CLOSED SMILE
    // ─────────────────────────────────────────────

    const mouth = scene.add.arc(
        0,
        isSchool ? -12 : -9,
        isSchool ? 3.5 : 3,
        isSchool ? 25 : 20,
        isSchool ? 155 : 160,
        false,
        0x7c2d12,
        0
    );

    mouth.setStrokeStyle(
        isSchool ? 1 : 1.2,
        0x7c2d12,
        1
    );

    // ─────────────────────────────────────────────
    // PLAYER NAME
    // ─────────────────────────────────────────────

    let nameText = null;

    if (showName) {
        const playerLabel =
            nickname.length > 24
                ? `${nickname.slice(0, 23)}...`
                : nickname;

        nameText = scene.add.text(
            0,
            isSchool ? -39 : -32,
            playerLabel,
            {
                fontSize: '13px',
                fontFamily: 'sans-serif',
                fontStyle: 'bold',
                color: '#FFE838',
                align: 'center',
                stroke: '#000000',
                strokeThickness: 4,

                shadow: {
                    offsetX: 1,
                    offsetY: 1,
                    color: '#000000',
                    blur: 3,
                    stroke: true,
                    fill: true,
                },
            }
        );

        nameText.setOrigin(
            0.5,
            1
        );
    }

    // ─────────────────────────────────────────────
    // DISPLAY ORDER
    // ─────────────────────────────────────────────

    const characterParts = [
        playerShadow,
    ];

    if (backpack) {
        characterParts.push(backpack);
    }

    characterParts.push(
        legL,
        legR
    );

    if (sockL) {
        characterParts.push(sockL);
    }

    if (sockR) {
        characterParts.push(sockR);
    }

    characterParts.push(
        shoeL,
        shoeR
    );

    if (sleeveL) {
        characterParts.push(sleeveL);
    }

    if (sleeveR) {
        characterParts.push(sleeveR);
    }

    characterParts.push(
        armL,
        armR
    );

    if (handL) {
        characterParts.push(handL);
    }

    if (handR) {
        characterParts.push(handR);
    }

    characterParts.push(
        bodyPart
    );

    if (collarL) {
        characterParts.push(collarL);
    }

    if (collarR) {
        characterParts.push(collarR);
    }

    if (bottomPart) {
        characterParts.push(bottomPart);
    }

    if (strapL) {
        characterParts.push(strapL);
    }

    if (strapR) {
        characterParts.push(strapR);
    }

    if (shortsLine) {
        characterParts.push(shortsLine);
    }

    characterParts.push(
        shirtDetail
    );

    if (shirtButton2) {
        characterParts.push(shirtButton2);
    }

    characterParts.push(
        hairBack
    );

    if (girlHairLeft) {
        characterParts.push(girlHairLeft);
    }

    if (girlHairRight) {
        characterParts.push(girlHairRight);
    }

    characterParts.push(
        headPart,
        hairFront,
        eyeL,
        eyeR,
        eyeHighlightL,
        eyeHighlightR
    );

    if (eyeSmallHighlightL) {
        characterParts.push(
            eyeSmallHighlightL
        );
    }

    if (eyeSmallHighlightR) {
        characterParts.push(
            eyeSmallHighlightR
        );
    }

    characterParts.push(
        blushL,
        blushR
    );

    if (nose) {
        characterParts.push(nose);
    }

    characterParts.push(
        mouth
    );

    if (hairBow) {
        characterParts.push(hairBow);
    }

    if (nameText) {
        characterParts.push(nameText);
    }

    playerGraphic.add(characterParts);

    // Keep characters roughly similar in displayed size
    playerGraphic.setDepth(1000);

    playerGraphic.setScale(
        isSchool ? 1.25 : 1.15
    );

    // ─────────────────────────────────────────────
    // RETURN ALL PARTS
    // ─────────────────────────────────────────────

    return {
        playerGraphic,
        playerShadow,

        character,
        isGirl,
        isSchool,

        legL,
        legR,

        sockL,
        sockR,

        shoeL,
        shoeR,

        sleeveL,
        sleeveR,

        armL,
        armR,

        handL,
        handR,

        bodyPart,
        bottomPart,

        strapL,
        strapR,
        shortsLine,

        shirtDetail,
        shirtButton2,

        collarL,
        collarR,

        hairBack,
        hairFront,

        girlHairLeft,
        girlHairRight,
        hairBow,

        headPart,

        eyeL,
        eyeR,

        eyeHighlightL,
        eyeHighlightR,

        eyeSmallHighlightL,
        eyeSmallHighlightR,

        blushL,
        blushR,

        nose,
        mouth,

        backpack,
        nameText,
    };
}