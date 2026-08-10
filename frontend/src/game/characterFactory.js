export function createChibiCharacter(scene, {
    x = 0,
    y = 0,
    character = 'boy',
    nickname = '',
    showName = true,
}) {
    const isGirl = character === 'girl';

    const characterColors = isGirl
        ? {
            shirt: 0xec4899,
            shirtBorder: 0x9d174d,
            trousers: 0x7c3aed,
            shoes: 0x4c1d95,
            hair: 0x4a2c1b,
            hairBorder: 0x2d160c,
            backpack: 0xa855f7,
            backpackBorder: 0x6b21a8,
        }
        : {
            shirt: 0x38bdf8,
            shirtBorder: 0x075985,
            trousers: 0x334155,
            shoes: 0x111827,
            hair: 0x5b321f,
            hairBorder: 0x2f1b12,
            backpack: 0xf97316,
            backpackBorder: 0x9a3412,
        };

    // ─────────────────────────────────────────
    // SAME CHARACTER AS THE ACTUAL GAME
    // ─────────────────────────────────────────

    const playerGraphic = scene.add.container(x, y);

    // Shadow
    const playerShadow = scene.add.ellipse(
        0,
        25,
        24,
        9,
        0x000000,
        0.22
    );

    // Legs
    const legL = scene.add.rectangle(
        -5,
        17,
        7,
        11,
        characterColors.trousers
    );
    legL.setOrigin(0.5);

    const legR = scene.add.rectangle(
        5,
        17,
        7,
        11,
        characterColors.trousers
    );
    legR.setOrigin(0.5);

    // Shoes
    const shoeL = scene.add.ellipse(
        -5,
        23,
        9,
        5,
        characterColors.shoes
    );

    const shoeR = scene.add.ellipse(
        5,
        23,
        9,
        5,
        characterColors.shoes
    );

    // Body
    const bodyPart = scene.add.rectangle(
        0,
        4,
        22,
        23,
        characterColors.shirt
    );

    bodyPart.setStrokeStyle(
        2,
        characterColors.shirtBorder
    );

    // Shirt detail
    const shirtDetail = scene.add.circle(
        0,
        5,
        3,
        0xffffff
    );

    // Arms
    const armL = scene.add.rectangle(
        -14,
        4,
        7,
        18,
        0xf6c28b
    );

    armL.setStrokeStyle(1.5, 0xc97c4b);

    const armR = scene.add.rectangle(
        14,
        4,
        7,
        18,
        0xf6c28b
    );

    armR.setStrokeStyle(1.5, 0xc97c4b);

    // Hair behind head
    const hairBack = scene.add.circle(
        0,
        -14,
        13,
        characterColors.hair
    );

    hairBack.setStrokeStyle(
        2,
        characterColors.hairBorder
    );

    let girlHairLeft = null;
    let girlHairRight = null;
    let hairBow = null;

    // Girl hair
    if (isGirl) {
        girlHairLeft = scene.add.ellipse(
            -10,
            -7,
            8,
            21,
            characterColors.hair
        );

        girlHairRight = scene.add.ellipse(
            10,
            -7,
            8,
            21,
            characterColors.hair
        );

        girlHairLeft.setStrokeStyle(
            1.5,
            characterColors.hairBorder
        );

        girlHairRight.setStrokeStyle(
            1.5,
            characterColors.hairBorder
        );

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

    // Face
    const headPart = scene.add.circle(
        0,
        -12,
        11,
        0xf6c28b
    );

    headPart.setStrokeStyle(
        1.8,
        0xc97c4b
    );

    // Hair fringe
    const hairFront = scene.add.arc(
        0,
        -17,
        10,
        195,
        345,
        false,
        characterColors.hair
    );

    // Eyes
    const eyeL = scene.add.circle(
        -4,
        -13,
        2.1,
        0x1e293b
    );

    const eyeR = scene.add.circle(
        4,
        -13,
        2.1,
        0x1e293b
    );

    // Eye highlights
    const eyeHighlightL = scene.add.circle(
        -3.4,
        -13.7,
        0.7,
        0xffffff
    );

    const eyeHighlightR = scene.add.circle(
        4.6,
        -13.7,
        0.7,
        0xffffff
    );

    // Blush
    const blushL = scene.add.ellipse(
        -7,
        -9,
        4,
        2,
        0xfb7185,
        0.6
    );

    const blushR = scene.add.ellipse(
        7,
        -9,
        4,
        2,
        0xfb7185,
        0.6
    );

    // Smile
    const mouth = scene.add.arc(
        0,
        -9,
        3,
        20,
        160,
        false,
        0x7c2d12
    );

    mouth.setStrokeStyle(
        1.2,
        0x7c2d12
    );

    // Backpack
    const backpack = scene.add.rectangle(
        -11,
        3,
        7,
        15,
        characterColors.backpack
    );

    backpack.setStrokeStyle(
        1.5,
        characterColors.backpackBorder
    );

    backpack.setDepth(-1);

    // Name
    let nameText = null;

    if (showName) {
        const playerLabel = nickname.length > 24
            ? `${nickname.slice(0, 23)}...`
            : nickname;

        nameText = scene.add.text(
            0,
            -32,
            playerLabel,
            {
                fontSize: '10px',
                fontFamily: 'sans-serif',
                fontStyle: 'bold',
                color: '#ffffff',
                align: 'center',
                stroke: '#1e3a5f',
                strokeThickness: 3,
            }
        );

        nameText.setOrigin(0.5, 1);
    }

    // Character parts
    const characterParts = [
        playerShadow,
        backpack,
        legL,
        legR,
        shoeL,
        shoeR,
        armL,
        armR,
        bodyPart,
        shirtDetail,
        hairBack,
    ];

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
        eyeHighlightR,
        blushL,
        blushR,
        mouth
    );

    if (hairBow) {
        characterParts.push(hairBow);
    }

    if (nameText) {
        characterParts.push(nameText);
    }

    playerGraphic.add(characterParts);

    playerGraphic.setDepth(1000);
    playerGraphic.setScale(1.15);

    return {
        playerGraphic,
        playerShadow,
        legL,
        legR,
        shoeL,
        shoeR,
        bodyPart,
        shirtDetail,
        armL,
        armR,
        hairBack,
        girlHairLeft,
        girlHairRight,
        hairBow,
        headPart,
        hairFront,
        eyeL,
        eyeR,
        eyeHighlightL,
        eyeHighlightR,
        blushL,
        blushR,
        mouth,
        backpack,
        nameText,
    };
}