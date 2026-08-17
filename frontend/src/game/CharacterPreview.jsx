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
                        x: 80,
                        y: 80,
                        character,
                        nickname: '',
                        showName: false,
                    });
                    previewCharacter.playerGraphic.setScale(2.0);
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
                margin: '0 auto',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
            }}
        />
    );
};

export default CharacterPreview;