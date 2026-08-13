export function createChibiCharacter(scene, {
    x = 0,
    y = 0,
    character = 'boy',
    nickname = '',
    showName = true,
}) {
    const isGirl = character === 'girl';

    const colors = {
        skin: 0xf5c18d,
        skinBorder: 0xc97c4b,

        hair: isGirl ? 0x33231b : 0x2b211c,
        hairBorder: 0x1b120e,

        shirt: 0xffffff,
        shirtBorder: 0xb8c4d1,

        uniformBlue: 0x172554,
        uniformBlueDark: 0x0f172a,

        shoes: 0x171717,
        shoesBorder: 0x050505,

        socks: 0xffffff,
        socksBorder: 0xd1d5db,
    };

    const playerGraphic = scene.add.container(x, y);

    // Shadow
    const playerShadow = scene.add.ellipse(
        0,
        30,
        30,
        8,
        0x000000,
        0.18
    );

    // Legs
    const legL = scene.add.rectangle(
        -6,
        18,
        7,
        10,
        colors.skin
    );

    const legR = scene.add.rectangle(
        6,
        18,
        7,
        10,
        colors.skin
    );

    // Short socks
    const sockL = scene.add.rectangle(
        -6,
        21,
        7,
        2.5,
        colors.socks
    );

    const sockR = scene.add.rectangle(
        6,
        21,
        7,
        2.5,
        colors.socks
    );

    sockL.setStrokeStyle(
        0.4,
        colors.socksBorder
    );

    sockR.setStrokeStyle(
        0.4,
        colors.socksBorder
    );

    // Black shoes
    const shoeL = scene.add.ellipse(
        -6,
        25.5,
        12,
        7,
        colors.shoes
    );

    const shoeR = scene.add.ellipse(
        6,
        25.5,
        12,
        7,
        colors.shoes
    );

    shoeL.setStrokeStyle(
        1,
        colors.shoesBorder
    );

    shoeR.setStrokeStyle(
        1,
        colors.shoesBorder
    );

    // White school shirt
    const bodyPart = scene.add.rectangle(
        0,
        3,
        24,
        23,
        colors.shirt
    );

    bodyPart.setStrokeStyle(
        1.5,
        colors.shirtBorder
    );

    // Sleeves closer to shoulder
    const sleeveL = scene.add.rectangle(
        -13,
        -1,
        7,
        8,
        colors.shirt
    );

    const sleeveR = scene.add.rectangle(
        13,
        -1,
        7,
        8,
        colors.shirt
    );

    sleeveL.setStrokeStyle(
        1,
        colors.shirtBorder
    );

    sleeveR.setStrokeStyle(
        1,
        colors.shirtBorder
    );

    // Lower arms closer to body
    const armL = scene.add.rectangle(
        -13,
        6,
        5.5,
        8,
        colors.skin
    );

    const armR = scene.add.rectangle(
        13,
        6,
        5.5,
        8,
        colors.skin
    );

    armL.setStrokeStyle(
        1,
        colors.skinBorder
    );

    armR.setStrokeStyle(
        1,
        colors.skinBorder
    );

    // Hands closer to shoulders/body
    const handL = scene.add.circle(
        -13,
        10,
        2.8,
        colors.skin
    );

    const handR = scene.add.circle(
        13,
        10,
        2.8,
        colors.skin
    );

    handL.setStrokeStyle(
        0.8,
        colors.skinBorder
    );

    handR.setStrokeStyle(
        0.8,
        colors.skinBorder
    );

    // Collar
    const collarL = scene.add.triangle(
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

    const collarR = scene.add.triangle(
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
    const shirtDetail = scene.add.circle(
        0,
        4,
        1.2,
        0x64748b
    );

    const shirtButton2 = scene.add.circle(
        0,
        9,
        1.2,
        0x64748b
    );

    // Uniform bottom
    let bottomPart;
    let strapL = null;
    let strapR = null;
    let shortsLine = null;

    if (isGirl) {
        bottomPart = scene.add.rectangle(
            0,
            14,
            22,
            18,
            colors.uniformBlue
        );

        bottomPart.setStrokeStyle(
            1.4,
            colors.uniformBlueDark
        );

        strapL = scene.add.rectangle(
            -6,
            2,
            3.5,
            15,
            colors.uniformBlue
        );

        strapR = scene.add.rectangle(
            6,
            2,
            3.5,
            15,
            colors.uniformBlue
        );

        strapL.setStrokeStyle(
            0.8,
            colors.uniformBlueDark
        );

        strapR.setStrokeStyle(
            0.8,
            colors.uniformBlueDark
        );
    } else {
        bottomPart = scene.add.rectangle(
            0,
            15,
            22,
            11,
            colors.uniformBlue
        );

        bottomPart.setStrokeStyle(
            1.4,
            colors.uniformBlueDark
        );

        shortsLine = scene.add.rectangle(
            0,
            18,
            1.3,
            7,
            colors.uniformBlueDark
        );
    }

    // Hair
    let hairBack;
    let hairFront;
    let girlHairLeft = null;
    let girlHairRight = null;
    let hairBow = null;

    if (isGirl) {
        hairBack = scene.add.ellipse(
            0,
            -18,
            27,
            28,
            colors.hair
        );

        hairBack.setStrokeStyle(
            1.6,
            colors.hairBorder
        );

        girlHairLeft = scene.add.ellipse(
            -9.5,
            -8,
            7,
            21,
            colors.hair
        );

        girlHairRight = scene.add.ellipse(
            9.5,
            -8,
            7,
            21,
            colors.hair
        );

        girlHairLeft.setStrokeStyle(
            1.2,
            colors.hairBorder
        );

        girlHairRight.setStrokeStyle(
            1.2,
            colors.hairBorder
        );

        // Hair moved DOWN to cover more forehead
        hairFront = scene.add.arc(
            0,
            -23,
            12.5,
            195,
            345,
            false,
            colors.hair
        );

        hairFront.setStrokeStyle(
            0.8,
            colors.hairBorder
        );

        // Small hair clip
        hairBow = scene.add.rectangle(
            9,
            -25,
            4,
            1.8,
            0xec4899
        );

        hairBow.setRotation(-0.25);
    } else {
        hairBack = scene.add.ellipse(
            0,
            -20,
            26,
            19,
            colors.hair
        );

        hairBack.setStrokeStyle(
            1.6,
            colors.hairBorder
        );

        // Hair moved DOWN to cover more forehead
        hairFront = scene.add.arc(
            0,
            -23,
            12.5,
            200,
            340,
            false,
            colors.hair
        );

        hairFront.setStrokeStyle(
            0.8,
            colors.hairBorder
        );
    }

    // Small slim face
    const headPart = scene.add.ellipse(
        0,
        -17,
        24,
        27,
        colors.skin
    );

    headPart.setStrokeStyle(
        1.5,
        colors.skinBorder
    );

    // Eyes
    const eyeL = scene.add.ellipse(
        -4.5,
        -18,
        4.5,
        5.5,
        0x172033
    );

    const eyeR = scene.add.ellipse(
        4.5,
        -18,
        4.5,
        5.5,
        0x172033
    );

    const eyeHighlightL = scene.add.circle(
        -3.8,
        -19,
        0.9,
        0xffffff
    );

    const eyeHighlightR = scene.add.circle(
        5.2,
        -19,
        0.9,
        0xffffff
    );

    const eyeSmallHighlightL = scene.add.circle(
        -5.1,
        -16.5,
        0.45,
        0xffffff
    );

    const eyeSmallHighlightR = scene.add.circle(
        3.9,
        -16.5,
        0.45,
        0xffffff
    );

    // No eyebrows

    // Blush
    const blushL = scene.add.ellipse(
        -7,
        -12.5,
        4,
        1.8,
        0xfb7185,
        0.35
    );

    const blushR = scene.add.ellipse(
        7,
        -12.5,
        4,
        1.8,
        0xfb7185,
        0.35
    );

    // Nose
    const nose = scene.add.circle(
        0,
        -14,
        0.7,
        0xd89463
    );

    // Closed curved smile
    const mouth = scene.add.arc(
        0,          // x
        -12,        // y
        3.5,        // radius
        25,         // start angle
        155,        // end angle
        false,
        0x7c2d12,
        0           // transparent fill
    );

    mouth.setStrokeStyle(
        1,
        0x7c2d12,
        1
    );

    // Player name
    let nameText = null;

    if (showName) {
        const playerLabel =
            nickname.length > 24
                ? `${nickname.slice(0, 23)}...`
                : nickname;

        nameText = scene.add.text(
            0,
            -39,
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

        nameText.setOrigin(0.5, 1);
    }

    // Display order
    const characterParts = [
        playerShadow,

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

        collarL,
        collarR,

        bottomPart,
    ];

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
        shirtDetail,
        shirtButton2,

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
        eyeHighlightR,

        eyeSmallHighlightL,
        eyeSmallHighlightR,

        blushL,
        blushR,

        nose,
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
    playerGraphic.setScale(1.25);

    return {
        playerGraphic,
        playerShadow,

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

        nameText,
    };
}