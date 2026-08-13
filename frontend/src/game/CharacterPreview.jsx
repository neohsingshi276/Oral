import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { createChibiCharacter } from './characterFactory';

const CharacterPreview = ({ character }) => {
    const containerRef = useRef(null);

    useEffect(() => {
        if (!containerRef.current) return;

        const config = {
            type: Phaser.CANVAS,

            width: 160,
            height: 160,

            transparent: true,

            parent: containerRef.current,

            scene: {
                create() {
                    const previewCharacter = createChibiCharacter(this, {
                        x: 70,
                        y: 66,
                        character,
                        nickname: '',
                        showName: false,
                    });
                    previewCharacter.playerGraphic.setScale(1.7);
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
                width: '160px',
                height: '160px',
                margin: '0 auto 0.8rem',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
            }}
        />
    );
};

export default CharacterPreview;