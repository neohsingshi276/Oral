import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { createChibiCharacter } from './characterFactory';

const CharacterPreview = ({ character }) => {
    const containerRef = useRef(null);

    useEffect(() => {
        if (!containerRef.current) return;

        // Clear old Phaser canvas before making a new preview
        containerRef.current.innerHTML = '';

        const config = {
            type: Phaser.CANVAS,

            width: 130,
            height: 150,

            transparent: true,

            parent: containerRef.current,

            scene: {
                create() {
                    const previewCharacter = createChibiCharacter(this, {
                        x: 65,
                        y: 76,
                        character,
                        nickname: '',
                        showName: false,
                    });

                    // Keep all four previews approximately the same size
                    const isSchoolCharacter =
                        character === 'schoolBoy' ||
                        character === 'schoolGirl';

                    previewCharacter.playerGraphic.setScale(
                        isSchoolCharacter ? 1.8 : 2.0
                    );
                },
            },

            scale: {
                mode: Phaser.Scale.NONE,
            },

            render: {
                antialias: true,
            },
        };

        const game = new Phaser.Game(config);

        return () => {
            game.destroy(true);
        };
    }, [character]);

    return (
        <div
            ref={containerRef}
            style={{
                width: '130px',
                height: '150px',
                margin: '0 auto',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                overflow: 'hidden',
            }}
        />
    );
};

export default CharacterPreview;